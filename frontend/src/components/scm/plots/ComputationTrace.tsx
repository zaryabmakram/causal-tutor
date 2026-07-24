"use client";

import { useEffect, useState } from "react";
import { Braces } from "lucide-react";
import { fetchComputationTrace, type ComputationTraceResult } from "@/lib/api";
import type { SCMSchema } from "@/types";

interface ComputationTraceProps {
  schema: SCMSchema;
  observedValues: Record<string, number>;
  abducedNoise: Record<string, number>;
  interveneId: string;
  interveneValue: number;
}

export default function ComputationTrace({
  schema, observedValues, abducedNoise, interveneId, interveneValue,
}: ComputationTraceProps) {
  const [trace, setTrace] = useState<ComputationTraceResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchComputationTrace(schema, observedValues, abducedNoise, interveneId, interveneValue)
      .then((res) => { if (!cancelled) setTrace(res); })
      .catch((err) => console.error("Trace fetch failed", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schema, observedValues, abducedNoise, interveneId, interveneValue]);

  if (loading || !trace) {
    return (
      <div className="flex h-40 items-center justify-center text-[12px] text-slate-300">Computing trace...</div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-4 text-[12.5px] leading-snug text-slate-500">
        See the exact calculations that demonstrate the three-step process of: abduction-action-prediction.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-slate-600">
            <Braces size={13} className="text-slate-400" />
            Structural Equations
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-600">
            {trace.structural_equations.map((eq, i) => (
              <div key={i}>{eq}</div>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold text-sky-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">1</span>
              Abduction
            </div>
            <span className="text-[11.5px] text-slate-400">Calculate noise from observation</span>
          </div>
          <div className="flex flex-col gap-1.5 font-mono text-[12.5px]">
            {trace.abduction.map((line, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-l-2 border-sky-200 pl-2">
                <span className="text-slate-500">
                  {line.formula} <span className="text-slate-400">= {line.substituted}</span>
                </span>
                <span className="flex-shrink-0 font-semibold text-slate-700">= {line.result.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "#DFAD5E" }}>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: "#DFAD5E" }}
              >
                2
              </span>
              Action
            </div>
            <span className="text-[11.5px] text-slate-400">Apply hypothetical change</span>
          </div>
          <div className="font-mono text-[12.5px] text-slate-600">
            {trace.action.target_name} := {trace.action.value}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">3</span>
              Prediction
            </div>
            <span className="text-[11.5px] text-slate-400">Propagate through the SCM</span>
          </div>
          <div className="flex flex-col gap-1.5 font-mono text-[12.5px]">
            {trace.prediction.map((line, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-l-2 border-emerald-200 pl-2">
                <span className="text-slate-500">
                  {line.formula} <span className="text-slate-400">= {line.substituted}</span>
                </span>
                <span className="flex-shrink-0 font-semibold text-slate-700">= {line.result.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}