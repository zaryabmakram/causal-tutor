"use client";

import { useState } from "react";
import { MousePointerClick, HelpCircle } from "lucide-react";
import type { Intervention, SCMVariable } from "@/types";

interface InterventionPanelProps {
  variables: SCMVariable[];
  onCancel: () => void;
  onRun: (iv: Intervention) => void;
}
  
export default function InterventionPanel({ variables, onCancel, onRun }: InterventionPanelProps) {
  const [targetId, setTargetId] = useState(variables[1]?.id ?? variables[0]?.id ?? "");
  const [type, setType] = useState<"soft" | "hard">("hard");

  const [hardValue, setHardValue] = useState("1.0");
  const [softCoeffs, setSoftCoeffs] = useState<Record<string, string>>({});
  const [softNoiseCoeff, setSoftNoiseCoeff] = useState("1");
  const [confirmUnchanged, setConfirmUnchanged] = useState(false);

  const target = variables.find((v) => v.id === targetId);
  const targetName = target?.name ?? "";

  // display new structural equation inline (soft intervention)
  const softEquationDisplay = target
  ? [
      ...target.dependencies.map((depId) => `${softCoeffs[depId] ?? target.coefficients[depId]}·${variables.find(v => v.id === depId)?.name}`),
      `${softNoiseCoeff}·${target.noise.name}`,
    ].join(" + ")
  : "";

  // has the user actually touched any coefficient away from the original equation?
  const softEquationUnchanged =
    !!target &&
    target.dependencies.every((depId) => !(depId in softCoeffs)) &&
    softNoiseCoeff === "1";

  const runIntervention = () => {
    if (type === "hard") {
      onRun({ type: "hard", target_id: targetId, value: parseFloat(hardValue) || 0 });
    } else {
      const coefficients: Record<string, number> = {};
      target?.dependencies.forEach((depId) => {
        coefficients[depId] = parseFloat(softCoeffs[depId] ?? String(target.coefficients[depId])) || 0;
      });
      onRun({
        type: "soft",
        target_id: targetId,
        coefficients,
        noise_coefficient: parseFloat(softNoiseCoeff) || 1,
      });
    }
  };

  const handleRunClick = () => {
    if (type === "soft" && softEquationUnchanged && !confirmUnchanged) {
      setConfirmUnchanged(true);
      return;
    }
    setConfirmUnchanged(false);
    runIntervention();
  };

  return (
    <div className="w-[340px] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MousePointerClick size={16} className="text-slate-700" />
          <span className="text-[15px] font-bold text-slate-800">Create an Intervention</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-semibold text-slate-500">Intervene on:</div>
        <select
          value={targetId}
          onChange={(e) => {
            setTargetId(e.target.value);
            setConfirmUnchanged(false);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700 focus:border-slate-400 focus:outline-none"
        >
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-semibold text-slate-500">Type:</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setType("soft");
              setConfirmUnchanged(false);
            }}
            className={`flex-1 rounded-lg border py-2 text-[14px] font-semibold transition-colors ${
              type === "soft"
                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                : "border-slate-200 text-slate-400 hover:bg-slate-50"
            }`}
          >
            Soft
          </button>
          <button
            onClick={() => {
              setType("hard");
              setConfirmUnchanged(false);
            }}
            className={`flex-1 rounded-lg border py-2 text-[14px] font-semibold transition-colors ${
              type === "hard"
                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                : "border-slate-200 text-slate-400 hover:bg-slate-50"
            }`}
          >
            Hard
          </button>
        </div>
      </div>

      {type === "hard" ? (
        <>
          <div className="mb-4">
            <div className="mb-1.5 text-[13px] font-semibold text-slate-500">Set value to:</div>
            <input
              type="number"
              step="any"
              value={hardValue}
              onChange={(e) => setHardValue(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-[13px] text-amber-800">
            do({targetName} = {hardValue || "1.0"})
          </div>

          <p className="mb-5 text-[12px] leading-snug text-slate-400">
            This forces <span className="font-semibold text-slate-500">{targetName}</span> to <span className="font-semibold text-slate-500">{hardValue || "1.0"}</span>, removes all incoming edges to it, and re-samples downstream variables.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-1.5 text-[13px] font-semibold text-slate-500">Set equation to:</div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[14px] text-slate-700">
              {target?.dependencies.map((depId) => {
                const dep = variables.find((v) => v.id === depId);
                const value = softCoeffs[depId] ?? String(target.coefficients[depId]);
                return (
                  <div key={depId} className="flex items-center gap-1.5">
                    <input
                      key={depId}
                      type="number"
                      step="any"
                      value={value}
                      onChange={(e) => {
                        setSoftCoeffs((prev) => ({ ...prev, [depId]: e.target.value }));
                        setConfirmUnchanged(false);
                      }}
                      className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center focus:border-slate-400 focus:outline-none"
                    />
                    <span>{dep?.name}</span>
                    <span className="text-slate-400">+</span>
                  </div>
                );
              })}
              <input 
                key="noise"
                type="number"
                step="any"
                value={softNoiseCoeff} 
                onChange={(e) => {
                  setSoftNoiseCoeff(e.target.value);
                  setConfirmUnchanged(false);
                }} 
                className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center focus:border-slate-400 focus:outline-none" 
              />
              <span>{target?.noise.name}</span>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 font-mono text-[13px] text-sky-800">
            do({targetName} = {softEquationDisplay})
          </div>

          <p className="mb-5 text-[12px] leading-snug text-slate-400">
            This updates the structural equation for <span className="font-semibold text-slate-500">{targetName}</span>, but it preserves structural dependencies.
          </p>
        </>
      )}

      {confirmUnchanged && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <HelpCircle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <p className="text-[12.5px] leading-snug text-amber-800">
            You didn't change the structural equation for {targetName}. Confirm intervention?
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-rose-200 py-2 text-[13px] font-semibold text-rose-500 transition-colors hover:bg-rose-50"
        >
          Cancel
        </button>
        <button
          onClick={handleRunClick}
          className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {confirmUnchanged ? "Confirm" : "Run"}
        </button>
      </div>
    </div>
  );
}