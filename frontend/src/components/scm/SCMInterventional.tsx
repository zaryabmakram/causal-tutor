"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Share2Icon} from "lucide-react";
import { sampleScmSchema, type SCMVariableResult } from "@/lib/api";
import { edgesFromSchema } from "@/types";
import { formatFunctionalForm, formatDistribution, formatEquation } from "@/lib/scmdisplay";
import ComparisonHistogram from "@/components/scm/plots/OverlayedHistogram";
import type { SCMSchema, Intervention } from "@/types";
import JointDistribution from "./plots/JointDist";
import SCMDAGView from "./widgets/SCMDAGView";
import ResizablePanels from "./widgets/ResizablePanels";

interface SCMInterventionalTabProps {
  schema: SCMSchema;
  intervention: Intervention | null;
}

export default function SCMInterventionalTab({ schema, intervention }: SCMInterventionalTabProps) {
  const variables = schema.variables;
  const edges = useMemo(() => edgesFromSchema(schema), [schema]);
  const [sampleSize, setSampleSize] = useState(1000);
  const [selectedVarId, setSelectedVarId] = useState(variables[0]?.id ?? "");
  const [results, setResults] = useState<Record<string, SCMVariableResult> | null>(null);
  const [intervenedResults, setIntervenedResults] = useState<Record<string, SCMVariableResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [distTab, setDistTab] = useState<"Marginal" | "Joint">("Marginal");

  useEffect(() => {
    if (!intervention) return;
    let cancelled = false;
    setLoading(true);
    sampleScmSchema(schema, sampleSize, undefined, intervention)
      .then((res) => {
        if (!cancelled) {
          setResults(res.results);
          setIntervenedResults(res.intervened_results ?? null);
        }
      })
      .catch((err) => console.error("Sampling failed", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [schema, sampleSize, intervention]);

  const observed = results?.[selectedVarId];
  const intervened = intervenedResults?.[selectedVarId];
  const target = intervention ? variables.find((v) => v.id === intervention.target_id) : null;

  const doDisplay = intervention && target
    ? intervention.type === "hard"
      ? `do(${target.name} = ${intervention.value})`
      : `do(${target.name} = ${target.dependencies
          .map((depId) => `${intervention.coefficients[depId]}·${variables.find((v) => v.id === depId)?.name}`)
          .join(" + ")}${intervention.noise_coefficient !== 1 ? ` + ${intervention.noise_coefficient}·${target.noise.name}` : ` + ${target.noise.name}`})`
    : "";

  return (
    <ResizablePanels>
      {/* SCM */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-[45px] flex-shrink-0 items-center gap-3 bg-white border-b border-slate-200 px-4">
          <span className="font-serif text-sm font-semibold italic text-slate-500">ƒx</span>
          <span className="text-[14px] font-bold text-slate-600">Structural Causal Model</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          
          {intervention && target && (
            <div className={`mx-3 mt-3 rounded-lg border px-3 py-2 text-[12.5px] font-mono font-semibold ${
              intervention.type === "hard"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
            }`}>
              <div className="mb-0.5 font-sans text-[11px] font-bold uppercase tracking-wide opacity-70">
                {intervention.type === "hard" ? "Hard" : "Soft"} Intervention Active
              </div>
              {doDisplay}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 text-[14px] font-mono font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {variables.map((v) => v.noise.name).join(", ")}
          </div>

          <div className="flex flex-col gap-3 px-3 pb-3">
            {variables.map((v, i) => {
              const isTarget = intervention?.target_id === v.id;
              const isHardTarget = isTarget && intervention?.type === "hard";
              const isSoftTarget = isTarget && intervention?.type === "soft";
              const dotColor = isTarget
                ? intervention?.type === "hard" ? "bg-amber-400" : "bg-sky-400"
                : "bg-emerald-500";
              const functionalForm = formatFunctionalForm(v, i, { variables } as SCMSchema);
              const equationDisplay = results?.[v.id]?.equation_display ?? formatEquation(v, schema);

              return (
                <div
                  key={v.id}
                  className={`rounded-lg border p-3 ${
                    isTarget
                      ? intervention?.type === "hard"
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-sky-300 bg-sky-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="font-mono text-[14px] font-bold text-slate-800">{v.name}</span>
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`min-w-0 flex-1 font-mono text-[14px] ${isHardTarget ? "text-slate-400 line-through" : "text-slate-500"}`}>
                      ← {functionalForm}
                    </span>
                    <span className={`flex-shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] ${
                      isHardTarget
                        ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}>
                      <span className={isHardTarget ? "font-semibold text-slate-400" : "font-semibold text-slate-500"}>
                        {v.noise.name}
                      </span> ~ {formatDistribution(v.noise.distribution)}
                    </span>
                  </div>

                  {isHardTarget ? (
                    <>
                      <div className="mb-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[13px] text-slate-400 line-through">
                        := {equationDisplay}
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-100/50 px-2.5 py-1.5 font-mono text-[14px] font-bold text-amber-700">
                        := {intervention.value}
                      </div>
                    </>
                  ) : isSoftTarget ? (
                        <>
                          <div className="mb-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[13px] text-slate-400 line-through">
                            := {equationDisplay}
                          </div>
                          <div className="rounded-md border border-sky-200 bg-sky-100/50 px-2.5 py-1.5 font-mono text-[13px] font-semibold text-sky-700">
                            := {target?.dependencies
                              .map((depId) => `${intervention.coefficients[depId]}·${variables.find((v2) => v2.id === depId)?.name}`)
                              .join(" + ")}
                            {intervention.noise_coefficient !== 1
                              ? ` + ${intervention.noise_coefficient}·${target?.noise.name}`
                              : ` + ${target?.noise.name}`}
                          </div>
                        </>
                      ) : (
                    <div className="rounded-md border border-[#E4E9F5] bg-[#F6F8FD] px-2.5 py-1.5 font-mono text-[14px] text-[#4F70B0]">
                      := {equationDisplay}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DAG */}
      <div className="flex h-full min-h-0 flex-col items-center">
        <div className="flex h-[45px] w-full flex-shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <Share2Icon size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-600">DAG</span>
          </div>
        </div>

        <div className="flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden">
          <SCMDAGView variables={variables} showToggle={true} intervention={intervention}/>
        </div>
      </div>

      {/* Distributions */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">

        <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <BarChart2 size={15} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">Distributions</span>
        </div>

        <div className="flex flex-shrink-0 gap-5 border-b border-slate-100 px-4 pt-3 text-[12px] font-semibold">
          <button
            onClick={() => setDistTab("Marginal")}
            className={distTab === "Marginal" ? "border-b-2 border-slate-600 pb-2.5 text-slate-600" : "pb-2.5 text-slate-400 hover:text-slate-600"}
          >
            Marginal
          </button>
          <button
            onClick={() => setDistTab("Joint")}
            className={distTab === "Joint" ? "border-b-2 border-slate-600 pb-2.5 text-slate-600" : "pb-2.5 text-slate-400 hover:text-slate-600"}
          >
            Joint
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          
          {distTab === "Marginal" ? (
            <>
              <div className="flex w-full min-w-0 flex-shrink-0 gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80">
                {variables.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVarId(v.id)}
                    className={`flex-shrink-0 rounded-md px-3 py-1.5 font-mono text-[13px] font-semibold transition-colors ${
                      v.id === selectedVarId
                        ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 px-4 pb-2 text-[12px] font-medium text-slate-500 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#b0b0e9]" /> Observed
                </span>
                {intervention && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#34D399]" /> {doDisplay}
                  </span>
                )}
              </div>

              <div className="mx-4 rounded-lg border border-slate-100 p-4 flex-shrink-0">
                {loading || !observed ? (
                  <div className="flex h-32 items-center justify-center text-[12px] text-slate-300">Sampling...</div>
                ) : (
                  <ComparisonHistogram observed={observed.histogram} intervened={intervened?.histogram} />
                )}
              </div>

              <div className="mt-3 px-4 flex-shrink-0">
                <div className="grid grid-cols-[1fr_70px_70px] gap-x-2 border-b border-slate-100 pb-2 text-[12px] font-semibold text-slate-400">
                  <span></span>
                  <span className="text-right">Obs.</span>
                  <span className="text-right">Inter.</span>
                </div>
                {[
                  ["Mean", observed?.stats.mean, intervened?.stats.mean],
                  ["Std. Dev.", observed?.stats.std, intervened?.stats.std],
                  ["Skew", observed?.stats.skew, intervened?.stats.skew],
                  ["Kurtosis", observed?.stats.kurtosis, intervened?.stats.kurtosis],
                ].map(([label, obsVal, intVal]) => (
                  <div key={label as string} className="grid grid-cols-[1fr_70px_70px] items-center gap-x-2 border-b border-slate-50 py-2.5 text-[13px]">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-right font-mono text-slate-600">{typeof obsVal === "number" ? obsVal.toFixed(2) : "—"}</span>
                    <span className={`rounded px-1.5 py-0.5 text-right font-mono ${intVal !== undefined ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-400"}`}>
                      {typeof intVal === "number" ? intVal.toFixed(2) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-5 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between text-[14px]">
                  <span className="text-slate-500">Sample Size (n)</span>
                  <span className="font-mono font-semibold text-[#4F70B0]">{sampleSize}</span>
                </div>
                <input
                  type="range" min={100} max={2000} step={100}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full accent-slate-800"
                />
              </div>
            </>
          ) : (
            <JointDistribution
              variables={variables}
              getSamples={(id) => (intervenedResults?.[id]?.raw_samples ?? results?.[id]?.raw_samples)}
              sampleSize={sampleSize}
              onSampleSizeChange={setSampleSize}
              loading={loading}
              interventionTargetId={intervention?.target_id}
              interventionType={intervention?.type}
            />
          )}
        </div>
      </div>
    </ResizablePanels>
  );
}