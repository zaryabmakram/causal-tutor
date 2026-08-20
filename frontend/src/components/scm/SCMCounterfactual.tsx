"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Lock, ChevronLeft } from "lucide-react";
import { abductScmSchema, computeCounterfactual, type AbductionResult } from "@/lib/api";
import SCMCounterfactualResult from "@/components/scm/SCMCounterFactualRes";
import type { SCMSchema } from "@/types";
import SCMDAGView from "./widgets/SCMDAGView";

export interface CounterfactualSession {
  inputs: Record<string, string>;
  abduction: AbductionResult | null;
  interveneId: string;
  newValue: string;
  queryId: string;
  cfResult: Record<string, number> | null;
}

interface SCMCounterfactualTabProps {
  schema: SCMSchema;
  session?: CounterfactualSession | null;
  onSessionChange?: (session: CounterfactualSession) => void;
  onContextChange?: (ctx: any) => void;
}

export default function SCMCounterfactualTab({ schema, session, onSessionChange, onContextChange }: SCMCounterfactualTabProps) {
  const variables = schema.variables;

  const [inputs, setInputs] = useState<Record<string, string>>(session?.inputs ?? {});
  const [abduction, setAbduction] = useState<AbductionResult | null>(session?.abduction ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [buildingQuery, setBuildingQuery] = useState(false);
  const [interveneId, setInterveneId] = useState(session?.interveneId ?? variables[0]?.id ?? "");
  const [newValue, setNewValue] = useState(session?.newValue ?? "");
  const [queryId, setQueryId] = useState(session?.queryId ?? variables[variables.length - 1]?.id ?? "");
  const [cfResult, setCfResult] = useState<Record<string, number> | null>(session?.cfResult ?? null);
  const [cfLoading, setCfLoading] = useState(false);

  useEffect(() => {
    if (!onSessionChange) return;
    onSessionChange({
      inputs,
      abduction,
      interveneId,
      newValue,
      queryId,
      cfResult,
    });
  }, [inputs, abduction, interveneId, newValue, queryId, cfResult, onSessionChange]);

  // define observed colors (blue) vs counterfactual (tan) to keep consistent
  const OBSERVED_BORDER_FONT_COLOR = "#285E7B";
  const OBSERVED_BG_COLOR = "#9EC0D6";
  const CF_BORDER_FONT_COLOR = "#BF9565";
  const CF_BG_COLOR = "#FFF7E2";

  useEffect(() => {
    if (!onContextChange) return;
    if (!abduction) {
      onContextChange(null);
      return;
    }
    onContextChange({
      observed_values: abduction.observed_values,
      abduced_noise: abduction.abduced_noise,
      intervene_id: interveneId,
      intervene_value: parseFloat(newValue) || null,
      query_id: queryId,
      cf_values: cfResult,
    });
  }, [abduction, interveneId, newValue, queryId, cfResult, onContextChange]);

  // handles abduce noise
  const handleNext = async () => {
    const parsed: Record<string, number> = {};
    for (const v of variables) {
      const raw = inputs[v.id];
      if (raw === undefined || raw.trim() === "" || isNaN(parseFloat(raw))) {
        setError(`Enter a valid value for ${v.name}.`);
        return;
      }
      parsed[v.id] = parseFloat(raw);
    }
    setError(null);
    setLoading(true);
    try {
      const result = await abductScmSchema(schema, parsed);
      setAbduction(result);
    } catch (err) {
      console.error(err);
      setError("Failed to compute abducted noise.");
    } finally {
      setLoading(false);
    }
  };

  // handles downstream calculation
  const handleRunCounterfactual = async () => {
    if (!abduction || !newValue.trim() || isNaN(parseFloat(newValue))) return;
    setCfLoading(true);
    try {
      const result = await computeCounterfactual(schema, abduction.abduced_noise, interveneId, parseFloat(newValue));
      setCfResult(result);
      setBuildingQuery(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCfLoading(false);
    }
  };

  if (!abduction) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col">
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="max-w-10xl text-[13.5px] leading-relaxed text-slate-500">
            To create a counterfactual, you will first need to create a specific observation by defining values for
            your variables. The model will then work backwards to find out the hidden noise that caused those
            observations. Next, you will make a query about what would have changed if one variable had been
            different, keeping everything else exactly the same.
          </p>
        </div>

        <div className="flex flex-1 items-start justify-center pt-10">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-[45px] items-center gap-2 border-b border-slate-200 bg-sky-50 px-4">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                1
              </span>
              <span className="text-[14px] font-bold text-sky-700">Observation</span>
            </div>

            <div className="px-5 py-5">
              <p className="mb-5 text-[12.5px] leading-snug text-slate-500">
                Enter the values observed for this instance. Noise will be abduced from this observation and fixed
                for the counterfactual query.
              </p>

              <div className="grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-3 gap-y-3">
                {variables.map((v) => (
                  <div key={v.id} className="contents">
                    <span className="truncate font-mono text-[15px] font-bold text-slate-700" title={v.name}>
                      {v.name}
                    </span>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={inputs[v.id] ?? ""}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700 placeholder:text-slate-300 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {error && (
                <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-rose-500">
                  <AlertCircle size={13} /> {error}
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? "Computing..." : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // when result is computed, go to CF result page
  if (cfResult) {
    return (
      <SCMCounterfactualResult
        schema={schema}
        observedValues={abduction.observed_values}
        abducedNoise={abduction.abduced_noise}
        cfValues={cfResult}
        interveneId={interveneId}
        interveneValue={parseFloat(newValue)}
        queryId={queryId}
        onQueryChange={async (newInterveneId, newInterveneValue, newQueryId) => {
          setInterveneId(newInterveneId);
          setNewValue(String(newInterveneValue));
          setQueryId(newQueryId);
          try {
            const result = await computeCounterfactual(schema, abduction.abduced_noise, newInterveneId, newInterveneValue);
            setCfResult(result);
          } catch (err) {
            console.error(err);
          }
        }}
        onDeleteQuery={() => {
          setAbduction(null);
          setCfResult(null);
          setBuildingQuery(false);
        }}
      />
    );
  }


  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="px-4 pt-4">
        <div
          className="flex h-[40px] flex-shrink-0 items-center rounded-lg border px-4 text-[13px] font-semibold"
          style={{
            backgroundColor: CF_BG_COLOR,
            borderColor: CF_BORDER_FONT_COLOR,
            color: CF_BORDER_FONT_COLOR,
          }}
        >
          {cfResult ? "1 active counterfactual query." : "No active counterfactual queries."}
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-2 divide-x divide-slate-200">
        {/* observed values panel */}
        <div className="flex min-h-0 flex-col">
          <div
            className="flex h-[45px] flex-shrink-0 items-center border-b px-4"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-[15px] font-bold" style={{ color: OBSERVED_BORDER_FONT_COLOR }}>
              Observed
            </span>
          </div>

          <div className="flex flex-1 min-h-0 flex-col">
            {/* top half is the observed values & abduced noise*/}
            <div className="flex-shrink-0 max-h-[45%] overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">Values</div>
                  <div
                    className="flex flex-col gap-2.5 rounded-lg border p-3"
                    style={{ borderColor: OBSERVED_BG_COLOR, backgroundColor: `${OBSERVED_BG_COLOR}22` }}
                  >
                    {variables.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-[15px]">
                        <span className="font-mono font-bold" style={{ color: OBSERVED_BORDER_FONT_COLOR }}>
                          {v.name}
                        </span>
                        <span className="font-mono text-slate-600">{abduction.observed_values[v.id]?.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                    Abduced Noise
                    <Lock size={11} className="text-slate-500" />
                  </div>
                  <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {variables.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-[15px]">
                        <span className="font-mono font-bold text-slate-600">{v.noise.name}</span>
                        <span className="font-mono text-slate-500">
                          {abduction.abduced_noise[v.id] !== undefined ? abduction.abduced_noise[v.id].toFixed(3) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/*give warning when observed values not compatible with model*/}
              {abduction.warnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  {abduction.warnings.map((w, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-amber-700">
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* bottom half -> the DAG */}
            <div className="flex-1 min-h-0 border-t border-slate-100 relative">
              <SCMDAGView
                variables={variables}
                nodeValues={abduction.observed_values}
                noiseValues={abduction.abduced_noise}
                showToggle={true}
              />
            </div>
          </div>
        </div>

        {/* Counterfactual panel */}
        <div className="flex min-h-0 flex-col">
          <div className="flex h-[45px] flex-shrink-0 items-center border-b border-slate-200 px-4">
            <span className="text-[15px] font-bold" style={{ color: CF_BORDER_FONT_COLOR }}>
              Counterfactual
            </span>
          </div>

          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4">
            {!buildingQuery && !cfResult && (
              <>
                <p className="mb-3 text-[13px] text-slate-400">You have no active counterfactual queries.</p>
                <button
                  onClick={() => setBuildingQuery(true)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[14px] font-semibold transition-colors"
                  style={{ borderColor: CF_BORDER_FONT_COLOR, backgroundColor: CF_BG_COLOR, color: CF_BORDER_FONT_COLOR }}
                >
                  Build Counterfactual Query
                </button>
              </>
            )}

            {buildingQuery && (
              <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-[#FDFDFD] p-5 shadow-sm">
                <div className="mb-4 text-center text-[15px] font-bold text-slate-500">Build Counterfactual Query</div>

                <div className="mb-3">
                  <div className="mb-1.5 text-[13px] text-slate-500">If</div>
                  <select
                    value={interveneId}
                    onChange={(e) => setInterveneId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700 focus:border-slate-400 focus:outline-none"
                  >
                    {variables.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <div className="mb-1.5 text-[13px] text-slate-500">had been</div>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div className="mb-3 flex items-center gap-1.5 text-[13px] text-slate-500">
                  instead of
                  <span
                    className="rounded-md border px-2 py-0.5 font-mono text-[13px] font-semibold"
                    style={{ borderColor: OBSERVED_BORDER_FONT_COLOR, color: OBSERVED_BORDER_FONT_COLOR, backgroundColor: `${OBSERVED_BG_COLOR}33` }}
                  >
                    {abduction.observed_values[interveneId]?.toFixed(1)}
                  </span>
                  , what would be the value of
                </div>

                <div className="mb-5">
                  <select
                    value={queryId}
                    onChange={(e) => setQueryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700 focus:border-slate-400 focus:outline-none"
                  >
                    {variables.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setBuildingQuery(false)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-white py-2 text-[13px] font-semibold text-sky-600 transition-colors hover:bg-sky-50"
                  >
                    <ChevronLeft size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleRunCounterfactual}
                    disabled={cfLoading || !newValue.trim()}
                    className="flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
                    style={{ borderColor: CF_BORDER_FONT_COLOR, backgroundColor: CF_BG_COLOR, color: CF_BORDER_FONT_COLOR }}
                  >
                    {cfLoading ? "Running..." : "Run Counterfactual"}
                  </button>
                </div>
              </div>
            )}

            {cfResult && (
              <div className="w-full max-w-sm text-center text-[13px] text-slate-400">
                Query result computed
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 px-5 py-3 text-[12.5px] text-slate-400">
        Once you've created a query, you'll be able to see its effects here and compare between the observed truth
        and the counterfactual scenario.
      </div>
    </div>
  );
}