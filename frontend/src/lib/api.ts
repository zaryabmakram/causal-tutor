/**
 * Resolves the backend base URL at build time. Set NEXT_PUBLIC_API_URL in the
 * deployment environment (Vercel) to your Render-hosted backend, e.g.
 *   NEXT_PUBLIC_API_URL=https://causal-tutor-api.onrender.com
 *
 * The NEXT_PUBLIC_ prefix is required by Next.js to embed the value in the
 * client bundle. Defaults to localhost for local docker-compose dev.
 */
const RAW = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = RAW.replace(/\/+$/, ""); // strip trailing slashes

export function apiUrl(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : "/" + path}`;
}

import type { Intervention, SCMSchema } from "@/types";

export interface SCMExampleSummary {
  id: string;
  name: string;
}

export async function fetchScmExamples(): Promise<SCMExampleSummary[]> {
  const res = await fetch(apiUrl("/scm/examples"));
  if (!res.ok) throw new Error("Failed to fetch SCM examples");
  return res.json();
}

export async function fetchScmExample(id: string): Promise<SCMSchema> {
  const res = await fetch(apiUrl(`/scm/examples/${id}`));
  if (!res.ok) throw new Error(`Failed to fetch SCM example '${id}'`);
  return res.json();
}

export interface SCMVariableResult {
  id: string;
  equation_display: string;
  stats: { mean: number; std: number; skew: number; kurtosis: number };
  histogram: { counts: number[]; density: number[]; bin_centers: number[]; bin_edges: number[] };
  kde: { x: number[]; y: number[] };
  raw_samples: number[];
}

export async function sampleScmSchema(
  schema: SCMSchema,
  nSamples: number,
  seed?: number,
  intervention?: Intervention
): Promise<{ results: Record<string, SCMVariableResult>; intervened_results?: Record<string, SCMVariableResult> }> {
  const res = await fetch(apiUrl("/scm/sample"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scm_schema: schema, n_samples: nSamples, seed, intervention }),
  });
  if (!res.ok) throw new Error("Failed to sample SCM");
  return res.json();
}

export interface AbductionResult {
  observed_values: Record<string, number>;
  abduced_noise: Record<string, number>;
  warnings: string[];
}

export async function abductScmSchema(
  schema: SCMSchema,
  observedValues: Record<string, number>
): Promise<AbductionResult> {
  const res = await fetch(apiUrl("/scm/abduct"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scm_schema: schema, observed_values: observedValues }),
  });
  if (!res.ok) throw new Error("Failed to abduct noise");
  return res.json();
}

export async function computeCounterfactual(
  schema: SCMSchema,
  abducedNoise: Record<string, number>,
  intervene_id: string,
  intervene_value: number
): Promise<Record<string, number>> {
  const res = await fetch(apiUrl("/scm/counterfactual"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scm_schema: schema,
      abduced_noise: abducedNoise,
      intervene_id,
      intervene_value,
    }),
  });
  if (!res.ok) throw new Error("Failed to compute counterfactual");
  const data = await res.json();
  return data.counterfactual_values;
}

export interface TreatmentResponsePoint {
  x: number;
  y: number;
}

export async function fetchTreatmentResponse(
  schema: SCMSchema,
  abducedNoise: Record<string, number>,
  intervene_id: string,
  query_id: string,
  valueRange: number[]
): Promise<TreatmentResponsePoint[]> {
  const res = await fetch(apiUrl("/scm/treatment-response"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scm_schema: schema,
      abduced_noise: abducedNoise,
      intervene_id,
      query_id,
      value_range: valueRange,
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch treatment response");
  const data = await res.json();
  return data.points;
}

export interface TraceLine {
  label: string;
  formula: string;
  substituted: string;
  result: number;
}

export interface ComputationTraceResult {
  structural_equations: string[];
  abduction: TraceLine[];
  action: { target_name: string; value: number };
  prediction: TraceLine[];
  final_values: Record<string, number>;
}

export async function fetchComputationTrace(
  schema: SCMSchema,
  observedValues: Record<string, number>,
  abducedNoise: Record<string, number>,
  intervene_id: string,
  intervene_value: number
): Promise<ComputationTraceResult> {
  const res = await fetch(apiUrl("/scm/computation-trace"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scm_schema: schema,
      observed_values: observedValues,
      abduced_noise: abducedNoise,
      intervene_id,
      intervene_value,
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch computation trace");
  return res.json();
}
