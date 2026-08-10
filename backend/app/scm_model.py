from enum import Enum
from typing import Dict, List
from pydantic import BaseModel, Field, model_validator
from typing_extensions import Literal


class NoiseType(str, Enum):
    normal = "normal"
    uniform = "uniform"
    bernoulli = "bernoulli"
    exponential = "exponential"


class NoiseDistribution(BaseModel):
    type: NoiseType
    params: Dict[str, float]

    @model_validator(mode="after")
    def validate_params(self):
        required = {
            NoiseType.normal: {"mean", "std"},
            NoiseType.uniform: {"min", "max"},
            NoiseType.bernoulli: {"p"},
            NoiseType.exponential: {"lam"},
        }[self.type]
        # missing checks and parameter check
        missing = required - self.params.keys()
        if missing:
            raise ValueError(f"{self.type} distribution missing params: {missing}")
        if self.type == NoiseType.normal and self.params["std"] <= 0:
            raise ValueError("std must be positive")
        if self.type == NoiseType.bernoulli and not (0 <= self.params["p"] <= 1):
            raise ValueError("p must be in [0, 1]")
        if self.type == NoiseType.exponential and self.params["lam"] <= 0:
            raise ValueError("lam must be positive")
        if self.type == NoiseType.uniform and self.params["min"] >= self.params["max"]:
            raise ValueError("min must be less than max")
        return self


class SCMNoise(BaseModel):
    # internal key (e.g. N2)
    key: str 
    # display key (e.g. N₂)
    name: str         
    distribution: NoiseDistribution


# Variable Schema
class SCMVariable(BaseModel):
    # internal vs display keys
    id: str                    
    name: str                   
    # parent var ids  
    dependencies: List[str] = []   
    # mapping par var ids to coeffs
    coefficients: Dict[str, float] = {}  
    intercept: float = 0.0
    noise: SCMNoise
    # default noise val
    noise_coefficient: float = 1.0

    @model_validator(mode="after")
    def coefficients_match_dependencies(self):
        if set(self.coefficients.keys()) != set(self.dependencies):
            raise ValueError(
                f"Variable '{self.id}': coefficients keys {set(self.coefficients.keys())} "
                f"must exactly match dependencies {set(self.dependencies)}"
            )
        return self

# SCM Schema
class SCMSchema(BaseModel):
    id: str
    name: str
    variables: List[SCMVariable]

    @model_validator(mode="after")
    def validate_dag(self):
        ids = {v.id for v in self.variables}
        if len(ids) != len(self.variables):
            raise ValueError("Duplicate variable ids in schema")
        for v in self.variables:
            for dep in v.dependencies:
                if dep not in ids:
                    raise ValueError(f"Variable '{v.id}' depends on unknown id '{dep}'")
        return self

    def variable_by_id(self, var_id: str) -> SCMVariable:
        return next(v for v in self.variables if v.id == var_id)

    def equation_display(self, var_id: str) -> str:
        var = self.variable_by_id(var_id)
        terms: list[str] = []
        if var.intercept != 0:
            terms.append(f"{var.intercept:g}")
        for dep_id, coeff in var.coefficients.items():
            dep_name = self.variable_by_id(dep_id).name
            terms.append(f"{coeff:g}·{dep_name}")
        noise_term = (
            f"{var.noise_coefficient:g}·{var.noise.name}"
            if var.noise_coefficient != 1
            else var.noise.name
        )
        terms.append(noise_term)
        return " + ".join(terms) if terms else "0"
    

class HardIntervention(BaseModel):
    type: Literal["hard"] = "hard"
    target_id: str
    value: float


class SoftIntervention(BaseModel):
    type: Literal["soft"] = "soft"
    target_id: str
    coefficients: Dict[str, float]
    noise_coefficient: float = 1.0

# intervention types
Intervention = HardIntervention | SoftIntervention

# traceline model
class TraceLine(BaseModel):
    label: str 
    # formula -> algebraic, sub -> inject values
    formula: str      
    substituted: str    
    result: float