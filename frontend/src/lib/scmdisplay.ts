import type { SCMVariable, SCMSchema, NoiseDistribution } from "@/types";

// display functions (noise distributions, functional forms, full structural equations)

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
export const toSubscript = (n: number) =>
  String(n).split("").map((d) => SUBSCRIPTS[+d]).join("");

export function formatDistribution(dist: NoiseDistribution): string {
  switch (dist.type) {
    case "normal":
      return `Normal (${dist.params.mean}, ${dist.params.std})`;
    case "uniform":
      return `Uniform (${dist.params.min}, ${dist.params.max})`;
    case "bernoulli":
      return `Bernoulli (${dist.params.p})`;
    case "exponential":
      return `Exponential (${dist.params.lam})`;
    default:
      return "";
  }
}

export function formatEquation(variable: SCMVariable, schema: SCMSchema): string {
  const nameById = new Map(schema.variables.map((v) => [v.id, v.name]));
  const terms: string[] = [];

  if (variable.intercept) terms.push(`${variable.intercept}`);

  variable.dependencies.forEach((depId) => {
    const coeff = variable.coefficients[depId];
    const depName = nameById.get(depId) ?? depId;
    terms.push(`${coeff}·${depName}`);
  });

  const noiseTerm =
    variable.noise_coefficient !== 1
      ? `${variable.noise_coefficient}·${variable.noise.name}`
      : variable.noise.name;
  terms.push(noiseTerm);

  return terms.join(" + ");
}

export function formatInputs(variable: SCMVariable, schema: SCMSchema): string {
  const nameById = new Map(schema.variables.map((v) => [v.id, v.name]));
  const depNames = variable.dependencies.map((depId) => nameById.get(depId) ?? depId);
  return [...depNames, variable.noise.name].join(", ");
}

export function formatFunctionalForm(variable: SCMVariable, index: number, schema: SCMSchema): string {
  const nameById = new Map(schema.variables.map((v) => [v.id, v.name]));
  const depNames = variable.dependencies.map((depId) => nameById.get(depId) ?? depId);
  const args = [...depNames, variable.noise.name].join(", ");
  return `f${toSubscript(index + 1)}(${args})`;
}