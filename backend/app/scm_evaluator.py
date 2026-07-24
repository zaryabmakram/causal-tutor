from typing import Dict, List, Optional
import numpy as np
from openai import AsyncOpenAI
from .scm_model import SCMSchema, SCMVariable, NoiseDistribution, NoiseType, HardIntervention, TraceLine
from scipy.stats import gaussian_kde


# topological sorting of scm --> acyclicity check
def topological_sort(variables: List[SCMVariable]) -> List[SCMVariable]:
    by_id = {v.id: v for v in variables}
    visited: set[str] = set()
    result: List[SCMVariable] = []

    def visit(vid: str, stack: set[str]):
        if vid in visited:
            return
        if vid in stack:
            raise ValueError(f"Cycle detected at variable '{vid}', SCM must be acyclic")
        var = by_id.get(vid)
        if var is None:
            return
        stack.add(vid)
        for dep in var.dependencies:
            visit(dep, stack)
        stack.discard(vid)
        visited.add(vid)
        result.append(var)

    for v in variables:
        visit(v.id, set())
    return result


def sample_noise(distribution: NoiseDistribution, n: int, rng: np.random.Generator) -> np.ndarray:
    p = distribution.params
    if distribution.type == NoiseType.normal:
        return rng.normal(p["mean"], p["std"], n)
    if distribution.type == NoiseType.uniform:
        return rng.uniform(p["min"], p["max"], n)
    if distribution.type == NoiseType.bernoulli:
        return rng.binomial(1, p["p"], n).astype(float)
    if distribution.type == NoiseType.exponential:
        return rng.exponential(1 / p["lam"], n)
    raise ValueError(f"Unsupported noise type: {distribution.type}")


def evaluate_scm(schema: SCMSchema, n: int, seed: Optional[int] = None) -> Dict[str, np.ndarray]:
    # Samples SCM structural equations at n_samples
    rng = np.random.default_rng(seed)
    ordered = topological_sort(schema.variables)
    samples: Dict[str, np.ndarray] = {}

    for var in ordered:
        noise_samples = sample_noise(var.noise.distribution, n, rng)
        result = np.full(n, var.intercept, dtype=float)
        for dep_id, coeff in var.coefficients.items():
            result += coeff * samples[dep_id]
        result += var.noise_coefficient * noise_samples
        samples[var.id] = result

    return samples


def compute_stats(data: np.ndarray) -> dict:
    mean = float(np.mean(data))
    std = float(np.std(data))
    skew = float(np.mean(((data - mean) / std) ** 3)) if std > 0 else 0.0
    # excessive/fisher's kurtosis
    kurtosis = float(np.mean(((data - mean) / std) ** 4) - 3) if std > 0 else 0.0
    return {"mean": mean, "std": std, "skew": skew, "kurtosis": kurtosis}


def compute_histogram(data: np.ndarray, bins: int | str | None = None) -> dict:
    # takes samples -> bins
    data = data[np.isfinite(data)]
    n = len(data)
    
    if bins is None:
        bins = 'auto' if n > 0 else 10
        
    counts, edges = np.histogram(data, bins=bins)
    bin_width = edges[1] - edges[0] if len(edges) > 1 else 1.0
    density = (counts / (n * bin_width)).tolist() if n > 0 and bin_width > 0 else counts.tolist()
    bin_centers = ((edges[:-1] + edges[1:]) / 2).tolist()
    
    return {
        "counts": counts.tolist(),
        "density": density,
        "bin_centers": bin_centers,
        "bin_edges": edges.tolist(),
    }


def compute_kde(data: np.ndarray, n_points: int = 100) -> dict:
    # needed to draw curve on histogram
    data = data[np.isfinite(data)]
    
    if len(data) < 2 or np.isclose(np.std(data), 0):
        return {"x": [], "y": []}
        
    try:
        kde = gaussian_kde(data)
        x = np.linspace(data.min(), data.max(), n_points)
        y = kde(x)
        return {"x": x.tolist(), "y": y.tolist()}
    except Exception:
        return {"x": [], "y": []}
    

def apply_intervention(schema: SCMSchema, intervention) -> SCMSchema:
    new_vars = []
    for v in schema.variables:
        if v.id != intervention.target_id:
            new_vars.append(v)
            continue
        if isinstance(intervention, HardIntervention) or intervention.type == "hard":
            # do(x = value): remove all incoming edges, fix at a constant
            new_vars.append(v.model_copy(update={
                "dependencies": [],
                "coefficients": {},
                "intercept": intervention.value,
                "noise_coefficient": 0.0,
            }))
        else:
            # soft: keep dependencies, but overwrite  structural coefficients
            new_vars.append(v.model_copy(update={
                "coefficients": intervention.coefficients,
                "noise_coefficient": intervention.noise_coefficient,
            }))
    return schema.model_copy(update={"variables": new_vars})


def abduce_noise(schema: SCMSchema, observed: Dict[str, float]) -> tuple[Dict[str, float], list[str]]:
    result: Dict[str, float] = {}
    warnings: list[str] = []

    for v in schema.variables:
        if v.id not in observed:
            raise ValueError(f"Missing observed value for variable '{v.id}'")
        val = observed[v.id]

        structural = v.intercept
        for dep_id, coeff in v.coefficients.items():
            if dep_id not in observed:
                raise ValueError(f"Missing observed value for dependency '{dep_id}' of '{v.id}'")
            structural += coeff * observed[dep_id]

        if v.noise_coefficient == 0:
            warnings.append(f"{v.name}'s noise could not be recovered (hard-intervened, no noise contribution).")
            continue

        noise_val = (val - structural) / v.noise_coefficient
        dist = v.noise.distribution

        # might impose stricter in observation directly, but warning works for now
        if dist.type == "bernoulli" and noise_val not in (0.0, 1.0):
            warnings.append(f"{v.name} implies {v.noise.name} = {noise_val:.3f}, which is not a valid Bernoulli outcome (0 or 1). This observation may be inconsistent with the model.")
        elif dist.type == "exponential" and noise_val < 0:
            warnings.append(f"{v.name} implies {v.noise.name} = {noise_val:.3f}, which is negative and impossible for an Exponential distribution. This observation may be inconsistent with the model.")
        elif dist.type == "uniform" and not (dist.params["min"] <= noise_val <= dist.params["max"]):
            warnings.append(f"{v.name} implies {v.noise.name} = {noise_val:.3f}, outside the Uniform({dist.params['min']}, {dist.params['max']}) support. This observation may be inconsistent with the model.")

        result[v.id] = noise_val

    return result, warnings


def compute_counterfactual(schema: SCMSchema, abduced_noise: Dict[str, float], intervene_id: str, intervene_value: float) -> Dict[str, float]:
    ordered = topological_sort(schema.variables)
    values: Dict[str, float] = {}

    for v in ordered:
        if v.id == intervene_id:
            values[v.id] = intervene_value
            continue

        val = v.intercept
        for dep_id, coeff in v.coefficients.items():
            val += coeff * values[dep_id]

        noise_val = abduced_noise.get(v.id, 0.0)
        val += v.noise_coefficient * noise_val

        values[v.id] = val

    return values


def compute_treatment_response(schema: SCMSchema, abduced_noise: Dict[str, float], intervene_id: str, query_id: str, value_range: List[float]) -> List[Dict[str, float]]:
    points = []
    for val in value_range:
        result = compute_counterfactual(schema, abduced_noise, intervene_id, val)
        points.append({"x": val, "y": result[query_id]})
    return points


def _fmt_signed(coeff: float, name: str, is_first: bool) -> str:
    # formatting signed terms
    if coeff >= 0:
        return (f"{coeff:g}·{name}" if is_first else f"+ {coeff:g}·{name}")
    return f"- {abs(coeff):g}·{name}"


def build_abduction_trace(schema: SCMSchema, observed: Dict[str, float], abduced_noise: Dict[str, float]) -> List[TraceLine]:
    # abduction eqn reversal: formula terms builds algebraic representation, sub terms injects actual observed vals
    lines: List[TraceLine] = []
    for v in schema.variables:
        if v.id not in abduced_noise:
            continue

        formula_terms = [v.name]
        sub_terms = [f"{observed[v.id]:.3f}"]
        for dep_id, coeff in v.coefficients.items():
            dep_name = schema.variable_by_id(dep_id).name
            dep_val = observed[dep_id]
            # flip coefficient sign and switch sides
            sign = "-" if coeff >= 0 else "+"
            formula_terms.append(f"{sign} {abs(coeff):g}·{dep_name}")
            sub_terms.append(f"{sign} {abs(coeff):g}({dep_val:.1f})")
        if v.intercept:
            # flip intercept sign and switch sides
            sign = "-" if v.intercept >= 0 else "+"
            formula_terms.append(f"{sign} {abs(v.intercept):g}")
            sub_terms.append(f"{sign} {abs(v.intercept):g}")

        formula = " ".join(formula_terms)
        substituted = " ".join(sub_terms)

        # divides by noise coeff
        if v.noise_coefficient != 1:
            formula = f"({formula}) / {v.noise_coefficient:g}"
            substituted = f"({substituted}) / {v.noise_coefficient:g}"

        lines.append(TraceLine(
            label=v.noise.name,
            formula=f"{v.noise.name} = {formula}",
            substituted=substituted,
            result=abduced_noise[v.id],
        ))
    return lines


def build_prediction_trace(schema: SCMSchema, abduced_noise: Dict[str, float], intervene_id: str, intervene_value: float) -> tuple[List[TraceLine], Dict[str, float]]:
    ordered = topological_sort(schema.variables)
    values: Dict[str, float] = {}
    lines: List[TraceLine] = []
    
    for v in ordered:
        # skip intervened variable
        if v.id == intervene_id:
            values[v.id] = intervene_value
            continue

        # same formula/sub logic as in abduce noise
        formula_terms = []
        sub_terms = []
        for i, (dep_id, coeff) in enumerate(v.coefficients.items()):
            dep_name = schema.variable_by_id(dep_id).name
            dep_val = values[dep_id]
            # handles signs
            formula_terms.append(_fmt_signed(coeff, dep_name, i == 0))
            connector = "" if i == 0 else (" + " if coeff >= 0 else " - ")
            sub_terms.append((f"{coeff:g}({dep_val:.1f})" if i == 0 else f"{connector}{abs(coeff):g}({dep_val:.1f})"))

        if v.intercept:
            formula_terms.append(f"+ {v.intercept:g}" if v.intercept >= 0 else f"- {abs(v.intercept):g}")
            sub_terms.append(f"+ {v.intercept:g}" if v.intercept >= 0 else f"- {abs(v.intercept):g}")

        noise_val = abduced_noise.get(v.id, 0.0)
        noise_term = f"{v.noise_coefficient:g}·{v.noise.name}" if v.noise_coefficient != 1 else v.noise.name
        formula_terms.append(f"+ {noise_term}")
        sub_terms.append(f"+ {noise_val:.3f}")

        val = v.intercept
        for dep_id, coeff in v.coefficients.items():
            val += coeff * values[dep_id]
        val += v.noise_coefficient * noise_val
        values[v.id] = val

        lines.append(TraceLine(
            label=v.name,
            formula=f"{v.name} = {' '.join(formula_terms)}",
            substituted=" ".join(sub_terms),
            result=val,
        ))

    return lines, values


def build_computation_trace(schema: SCMSchema, observed: Dict[str, float], abduced_noise: Dict[str, float], intervene_id: str, intervene_value: float) -> Dict:
    structural_equations = [
        f"{v.name} := {schema.equation_display(v.id)}" for v in schema.variables
    ]
    abduction = build_abduction_trace(schema, observed, abduced_noise)
    prediction, final_values = build_prediction_trace(schema, abduced_noise, intervene_id, intervene_value)

    return {
        "structural_equations": structural_equations,
        "abduction": [l.model_dump() for l in abduction],
        "action": {"target_name": schema.variable_by_id(intervene_id).name, "value": intervene_value},
        "prediction": [l.model_dump() for l in prediction],
        "final_values": final_values,
    }


# Chat prompt + context formatting

BASE_SYSTEM_PROMPT = """You are an embedded tutor inside the SCM Playground, a tool for learning structural causal models (SCMs) and causal inference concepts (Pearl's Ladder of Causation: observational, interventional, counterfactual).

Your job is to help the student understand:
- What structural causal models are and how they generate data
- The difference between observational, interventional (do-calculus), and counterfactual reasoning
- How to read and interpret the specific SCM currently loaded in their playground
- Why their intervention or counterfactual query produced the results it did

Guidelines:
- Keep explanations clear and consice. Avoid going into too much depth unless instructed to do so.
- Reference the student's actual current SCM (variable names, equations, noise distributions) rather than generic examples, whenever relevant.
- If the student asks about a concept unrelated to their current SCM (e.g. general causal inference theory), you may still explain it generally.
- Use the same variable names and notation the student sees in the UI (e.g. X₁, N₂).
- Do not fabricate numerical results. If asked for a specific computed value you don't have (e.g. "what would X₃ be if..."), tell the student to try it in the relevant tab (Observational, Interventional, or Counterfactual) rather than guessing.
- Keep explanations grounded in the actual equations and structure below, don't assume dependencies or coefficients that aren't listed.
"""


def format_schema_context(schema: SCMSchema) -> str:
    lines = ["Current SCM:"]
    for v in schema.variables:
        lines.append(f"{v.name} := {schema.equation_display(v.id)}")
        lines.append(f"Noise {v.noise.name} ~ {v.noise.distribution.type} {v.noise.distribution.params}")
    return "\n".join(lines)


def format_tab_context(active_tab: Optional[str]) -> str:
    # gives additional tab context to llm to avoid confusion
    if not active_tab:
        return ""
    tab_notes = {
        "Overview": "The student is on the Overview tab, seeing the SCM structure, DAG, and Pearl's Ladder of Causation diagram.",
        "Observational": "The student is on the Observational tab, viewing samples drawn from the SCM as-is (no intervention).",
        "Interventional": "The student is on the Interventional tab, viewing the effect of a do() intervention on the population.",
        "Counterfactual": "The student is on the Counterfactual tab, working through abduction-action-prediction for a specific observed unit.",
        "Sandbox": "The student is in the Sandbox, building a new SCM from scratch.",
    }
    return tab_notes.get(active_tab, "")

def format_observational_context(obs: Optional[dict]) -> str:
    if not obs:
        return ""
    parts = ["Observational tab state:"]
    # gets as much context as possible from curr state
    if obs.get("sampleSize"):
        parts.append(f"Sample size: {obs['sampleSize']}")
    if obs.get("distributionView"):
        parts.append(f"View: {obs['distributionView']}")
    if obs.get("stats"):
        parts.append(f"Stats: {obs['stats']}")
    return "\n".join(parts)


def format_intervention_context(intervention: Optional[dict]) -> str:
    # intervention context (variable, intervention type, eqns)
    if not intervention:
        return ""
    if intervention.get("type") == "hard":
        return f"Active intervention: do({intervention['target_id']} = {intervention['value']})"
    if intervention.get("type") == "soft":
        return f"Active soft intervention on {intervention['target_id']} with new coefficients {intervention.get('coefficients')}"
    return ""


def format_counterfactual_context(cf: Optional[dict]) -> str:
    # counterfactual context (curr values, which variable was intervened on (if in results), and prediction vals)
    if not cf:
        return ""
    parts = ["Active counterfactual query:"]
    if cf.get("observed_values"):
        parts.append(f"Observed: {cf['observed_values']}")
    if cf.get("intervene_id") is not None:
        parts.append(f"Query: had {cf['intervene_id']} been {cf.get('intervene_value')}, what would {cf.get('query_id')} be?")
    if cf.get("cf_values"):
        parts.append(f"Result: {cf['cf_values']}")
    return "\n".join(parts)


def format_sandbox_context(sb: Optional[dict]) -> str:
    # since in the sandbox tab there is no full scm yet, we get the context from the draft they are working on yet
    if not sb:
        return ""
    parts = [f"Sandbox: student is building a new SCM from scratch, currently has {sb.get('draftVariableCount', 0)} variable(s)."]
    for v in sb.get("draftVariables", []):
        deps = ", ".join(v.get("dependencies") or []) or "none"
        parts.append(f"  {v['name']}: parents=[{deps}], noise={v.get('noiseType')}")
    # if they are currently editing a variable
    if sb.get("currentlyEditing"):
        parts.append(f" Currently editing: {sb['currentlyEditing']}")
    return "\n".join(parts)



# context building is separated because not all contexts are available in each tab (as of now)

def build_scm_system_prompt(schema: SCMSchema, active_tab: Optional[str] = None, intervention: Optional[dict] = None, counterfactual: Optional[dict] = None) -> str:
    parts = [BASE_SYSTEM_PROMPT]
    if active_tab != "Sandbox":
        parts += ["", format_schema_context(schema)]

    tab_ctx = format_tab_context(active_tab)
    if tab_ctx:
        parts += ["", tab_ctx]

    iv_ctx = format_intervention_context(intervention)
    if iv_ctx:
        parts += ["", iv_ctx]

    cf_ctx = format_counterfactual_context(counterfactual)
    if cf_ctx:
        parts += ["", cf_ctx]

    return "\n".join(parts)


async def chat_about_scm( schema: SCMSchema, history: List[Dict[str, str]], api_key: str, active_tab: Optional[str] = None,
        intervention: Optional[dict] = None, observational: Optional[dict] = None, counterfactual: Optional[dict] = None, sandbox: Optional[dict] = None):
    
    system_prompt = build_scm_system_prompt(schema, active_tab, intervention, counterfactual)
    obs_ctx = format_observational_context(observational)
    if obs_ctx:
        system_prompt += "\n\n" + obs_ctx
    sb_ctx = format_sandbox_context(sandbox)
    if sb_ctx:
        system_prompt += "\n\n" + sb_ctx
    client = AsyncOpenAI(api_key=api_key)
    return await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}, *history],
        stream=True,
    )