export interface CitedParagraph {
  page: number;
  text: string;
  aspect: string;
}

export interface AlternativeMethod {
  method_name: string;
  feasibility: string;
  trade_off: string;
}

export interface MethodAnalysis {
  method_name: string;
  method_selection_summary: string;
  assumptions: string[];
  critique: string;
  result_justification_summary: string;
  cited_paragraphs: CitedParagraph[];
}

export interface CausalQueryResponse {
  paper_name: string;
  causal_query: string;
  causal_graph_mermaid: string;
  methods: MethodAnalysis[];
  alternative_methods: AlternativeMethod[];
  suggested_questions: string[];
}

export interface APIAnalysisResponse {
    analysis: CausalQueryResponse;
    full_text: string;
}

// ── DAG Playground Types ─────────────────────────────────────────────────

export interface ExampleDAG {
  id: string;
  name: string;
  description: string;
  concept: string;
  nodes: Array<{
    id: string;
    label: string;
    position: { x: number; y: number };
    isLatent?: boolean;
  }>;
  edges: Array<{ source: string; target: string }>;
}

export interface PathInfo {
  path: string[];
  path_type: string;
  contains_collider: boolean;
  collider_nodes: string[];
  confounders: string[];
}

export interface PathsResponse {
  directed_paths: PathInfo[];
  backdoor_paths: PathInfo[];
  all_paths: PathInfo[];
}

export interface DSeparationResult {
  d_separated: boolean;
  explanation: string;
  active_paths: string[][];
}

export interface DAGAnalysisResult {
  feedback: string;
  confounders: string[];
  colliders: string[];
  suggested_adjustments: string[];
  faithfulness_notes: string;
}
