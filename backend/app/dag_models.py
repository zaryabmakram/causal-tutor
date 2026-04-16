from typing import List, Optional
from pydantic import BaseModel, Field


class DAGNode(BaseModel):
    id: str
    label: str


class DAGEdge(BaseModel):
    source: str
    target: str


class DAGGraph(BaseModel):
    nodes: List[DAGNode]
    edges: List[DAGEdge]


# --- Validate ---

class DAGValidateRequest(BaseModel):
    graph: DAGGraph


class DAGValidateResponse(BaseModel):
    is_acyclic: bool
    topological_order: Optional[List[str]] = None
    cycle: Optional[List[str]] = None


# --- D-Separation ---

class DSeparationRequest(BaseModel):
    graph: DAGGraph
    node_a: str
    node_b: str
    conditioning_set: List[str] = []


class DSeparationResponse(BaseModel):
    d_separated: bool
    explanation: str
    active_paths: List[List[str]]


# --- Paths ---

class PathsRequest(BaseModel):
    graph: DAGGraph
    source: str
    target: str


class PathInfo(BaseModel):
    path: List[str]
    path_type: str = Field(description="directed, backdoor, or other")
    contains_collider: bool
    collider_nodes: List[str]
    confounders: List[str]


class PathsResponse(BaseModel):
    directed_paths: List[PathInfo]
    backdoor_paths: List[PathInfo]
    all_paths: List[PathInfo]


# --- AI Analyze ---

class DAGAnalyzeRequest(BaseModel):
    graph: DAGGraph
    research_question: Optional[str] = None


class DAGAnalyzeResponse(BaseModel):
    feedback: str = Field(description="Markdown-formatted qualitative feedback about the DAG")
    confounders: List[str] = Field(description="Identified confounder nodes")
    colliders: List[str] = Field(description="Identified collider nodes")
    suggested_adjustments: List[str] = Field(description="Suggested minimal adjustment sets or improvements")
    faithfulness_notes: str = Field(description="Notes on faithfulness assumption and potential violations")


# --- Chat ---

class DAGChatRequest(BaseModel):
    message: str
    history: List[dict]
    graph: DAGGraph
