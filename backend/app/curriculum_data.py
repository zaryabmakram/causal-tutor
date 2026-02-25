from typing import Dict, List, Any

# Curriculum Data Structure
# Defines the 10 Core Methods for the Learning Mode

CURRICULUM_METHODS: Dict[str, Dict[str, Any]] = {
    "difference_in_differences": {
        "title": "Difference-in-Differences (DiD)",
        "slug": "did",
        "description": "Estimates the causal effect of a treatment by comparing the change in outcome over time between a treatment group and a control group.",
        "key_assumptions": [
            "Parallel Trends: In the absence of treatment, the difference between treatment and control groups is constant over time.",
            "No Anticipation: Treatment group does not change behavior before the treatment starts."
        ],
        "example_scenario": "Measuring the effect of a minimum wage increase in New Jersey by comparing it to Pennsylvania (where it didn't change).",
        "dag_mermaid": """graph LR
    U((Unobserved\nConfounders)) --> Y
    T[Treatment] --> Y
    Time[Time] --> Y
    Group[Group] --> Y
    Group --> T
    Time --> T
    U -.-> Group
    U -.-> Time
    style T fill:#d1e7dd,stroke:#0f5132
    style Y fill:#e2e3e5,stroke:#41464b
"""
    },
    "instrumental_variables": {
        "title": "Instrumental Variables (IV)",
        "slug": "iv",
        "description": "Uses an external variable (instrument) that affects the treatment but has no direct effect on the outcome to solve omitted variable bias.",
        "key_assumptions": [
            "Relevance: The instrument (Z) must be correlated with the treatment (D).",
            "Exclusion Restriction: The instrument (Z) affects the outcome (Y) ONLY through the treatment (D)."
        ],
        "example_scenario": "Using distance to college as an instrument for education to estimate the return to schooling.",
        "dag_mermaid": """graph LR
    Z[Instrument] --> D[Treatment]
    D --> Y[Outcome]
    U((Confounder)) -.-> D
    U -.-> Y
    Z -.-x Y
    style Z fill:#cfe2ff,stroke:#084298
    style D fill:#d1e7dd,stroke:#0f5132
"""
    },
    "regression_discontinuity": {
        "title": "Regression Discontinuity (RDD)",
        "slug": "rdd",
        "description": "Exploits a cutoff rule to assign treatment, comparing individuals just above and just below the threshold.",
        "key_assumptions": [
            "Continuity: Potential outcomes are continuous at the cutoff.",
            "No Manipulation: Individuals cannot precisely manipulate their assignment variable."
        ],
        "example_scenario": "Effect of a scholarship given only to students with a test score > 80.",
        "dag_mermaid": """graph LR
    R[Running Variable] --> T[Treatment]
    T --> Y[Outcome]
    R --> Y
    U((Confounder)) -.-> Y
    U -.-> R
    style R fill:#fff3cd,stroke:#664d03
    style T fill:#d1e7dd,stroke:#0f5132
"""
    },
    "propensity_score_matching": {
        "title": "Propensity Score Matching (PSM)",
        "slug": "psm",
        "description": "Constructs a control group by matching treated units with non-treated units that have similar probabilities of receiving treatment based on observed covariates.",
        "key_assumptions": [
            "Conditional Independence (CIA): Selection is based entirely on observed covariates (X).",
            "Common Support: There is overlap in the probability of treatment between groups."
        ],
        "example_scenario": "Effect of job training on wages, matching participants to non-participants with similar age, education, and history.",
        "dag_mermaid": """graph LR
    X[Covariates] --> T[Treatment]
    X --> Y[Outcome]
    T --> Y
    style X fill:#e2e3e5,stroke:#41464b
    style T fill:#d1e7dd,stroke:#0f5132
"""
    },
    "synthetic_control": {
        "title": "Synthetic Control",
        "slug": "synthetic-control",
        "description": "Constructs a weighted combination of control units to create a 'synthetic' counterfactual that mimics the treated unit before the intervention.",
        "key_assumptions": [
            "No Spillover: Treatment in one unit does not affect the control pool.",
            "Perfect Pre-Trend Fit: The synthetic unit must closely track the treated unit in the pre-period."
        ],
        "example_scenario": "Effect of California's Proposition 99 (tobacco tax) by creating a synthetic California from other states.",
        "dag_mermaid": """graph LR
    W[Weights] --> S[Synthetic Control]
    S --> Y0[Counterfactual]
    T[Treatment] --> Y1[Observed]
    Y1 --- Y0
    linkStyle 3 stroke-width:0px,fill:none
"""
    },
    "frontdoor_criterion": {
        "title": "Frontdoor Criterion",
        "slug": "frontdoor",
        "description": "Identifies causal effects by using a mediator that fully captures the effect of treatment on outcome, even in the presence of unobserved confounding.",
        "key_assumptions": [
            "Exhaustive Mechanism: Treatment affects outcome ONLY through the mediator (M).",
            "No Unblocked Backdoors: No confounders between Mediator and Outcome."
        ],
        "example_scenario": "Effect of Smoking on Cancer. Smoking (T) -> Tar (M) -> Cancer (Y). Genotype (U) affects Smoking and Cancer but not Tar directly.",
        "dag_mermaid": """graph LR
    T[Treatment] --> M[Mediator]
    M --> Y[Outcome]
    U((Confounder)) -.-> T
    U -.-> Y
    style M fill:#d1e7dd,stroke:#0f5132
"""
    },
    "randomized_control_trial": {
        "title": "Randomized Control Trial (RCT)",
        "slug": "rct",
        "description": "The gold standard. Randomly assigns treatment to eliminate selection bias and ensure treatment is independent of potential outcomes.",
        "key_assumptions": [
            "SUTVA: No interference between units.",
            "Compliance: Assigned treatment corresponds to actual treatment."
        ],
        "example_scenario": "Testing a new drug by randomly giving half the patients the drug and half a placebo.",
        "dag_mermaid": """graph LR
    R[Randomization] --> T[Treatment]
    T --> Y[Outcome]
    U((Confounders)) -.-> Y
    R -.-x U
    style R fill:#d1e7dd,stroke:#0f5132
"""
    },
    "fixed_effects": {
        "title": "Fixed Effects (Panel Data)",
        "slug": "fixed-effects",
        "description": "Controls for time-invariant unobserved characteristics by analyzing changes within individuals or entities over time.",
        "key_assumptions": [
            "Strict Exogeneity: Errors are uncorrelated with past, present, and future treatments.",
            "Time-Invariant Confounders: Only controls for confounders that are constant over time."
        ],
        "example_scenario": "Effect of marriage on men's wages, controlling for 'ability' by looking at the same men before and after marriage.",
        "dag_mermaid": """graph LR
    T[Treatment] --> Y[Outcome]
    U((Time-Invariant\nUnobserved)) -.-> T
    U -.-> Y
    style U stroke-dasharray: 5 5
"""
    },
    "selection_models": {
        "title": "Heckman Selection Model",
        "slug": "heckman",
        "description": "Corrects for selection bias (e.g., we only observe wages for people who work) by modeling the probability of selection.",
        "key_assumptions": [
            "Exclusion Restriction: A variable that affects selection but not the outcome of interest.",
            "Normality: Errors in the selection and outcome equations are jointly normal."
        ],
        "example_scenario": "Estimating the wage offer for women, accounting for the fact that women with low wage offers might not work.",
        "dag_mermaid": """graph LR
    Z[Selection Var] --> S[Selected?]
    T[Education] --> Y[Wages]
    Y -.-> S
    style S fill:#fff3cd,stroke:#664d03
"""
    },
    "causal_forests": {
        "title": "Causal Forests (ML)",
        "slug": "causal-forests",
        "description": "A machine learning approach (Random Forests) adapted to estimate heterogeneous treatment effects.",
        "key_assumptions": [
            "Unconfoundedness: Selection is based on observed covariates X.",
            "Overlap: Propensity scores are strictly between 0 and 1."
        ],
        "example_scenario": "Estimating how the effect of a marketing email varies by customer age, location, and past spending.",
        "dag_mermaid": """graph LR
    X[High-Dim Covariates] --> T[Treatment]
    X --> Y[Outcome]
    T --> Y
    style X fill:#cfe2ff,stroke:#084298
"""
    }
}
