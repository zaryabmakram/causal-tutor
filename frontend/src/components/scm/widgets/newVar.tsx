"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Check } from "lucide-react";
import type { SCMVariable, NoiseDistribution } from "@/types";

interface NewVariablePanelProps {
  existingVariables: SCMVariable[];
  isFirstVariable?: boolean;
  initialVariable?: SCMVariable;
  mode?: "add" | "edit";
  onCancel: () => void;
  onAdd: (variable: SCMVariable) => void;
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const toSubscript = (n: number) => String(n).split("").map((d) => SUBSCRIPTS[+d]).join("");

export default function NewVariablePanel({
  existingVariables, isFirstVariable = false, initialVariable, mode = "add", onCancel, onAdd,
}: NewVariablePanelProps) {
  const isEdit = mode === "edit" && !!initialVariable;

  const [name, setName] = useState(initialVariable?.name ?? "");
  const [selectedParents, setSelectedParents] = useState<string[]>(initialVariable?.dependencies ?? []);
  const [distribution, setDistribution] = useState<"Normal" | "Uniform" | "Bernoulli" | "Exponential">(
    initialVariable ? (initialVariable.noise.distribution.type.charAt(0).toUpperCase() + initialVariable.noise.distribution.type.slice(1)) as any : "Normal"
  );

  // noise state def
  const [mean, setMean] = useState(String(initialVariable?.noise.distribution.params.mean ?? 0));
  const [std, setStd] = useState(String(initialVariable?.noise.distribution.params.std ?? 1));
  const [min, setMin] = useState(String(initialVariable?.noise.distribution.params.min ?? 0));
  const [max, setMax] = useState(String(initialVariable?.noise.distribution.params.max ?? 1));
  const [p, setP] = useState(String(initialVariable?.noise.distribution.params.p ?? 0.5));
  const [lam, setLam] = useState(String(initialVariable?.noise.distribution.params.lam ?? 1));
  const [coeffs, setCoeffs] = useState<Record<string, string>>(
    initialVariable ? Object.fromEntries(Object.entries(initialVariable.coefficients).map(([k, v]) => [k, String(v)])) : {}
  );
  const [noiseCoeff, setNoiseCoeff] = useState(String(initialVariable?.noise_coefficient ?? 1));
  const [error, setError] = useState<string | null>(null);

  const [zeroCoeffWarning, setZeroCoeffWarning] = useState<string | null>(null);
  const [pendingVariable, setPendingVariable] = useState<SCMVariable | null>(null);

  const newId = isEdit ? initialVariable!.id : `x${existingVariables.length + 1}`;
  const noiseKey = isEdit ? initialVariable!.noise.key : `n${existingVariables.length + 1}`;
  const noiseName = isEdit ? initialVariable!.noise.name : `N${toSubscript(existingVariables.length + 1)}`;

  const toggleParent = (id: string) => {
    setSelectedParents((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const buildDistribution = (): NoiseDistribution => {
    switch (distribution) {
      case "Normal":
        return { type: "normal", params: { mean: parseFloat(mean) || 0, std: parseFloat(std) || 1 } as Record<string, number> };
      case "Uniform":
        return { type: "uniform", params: { min: parseFloat(min) || 0, max: parseFloat(max) || 1 } as Record<string, number> };
      case "Bernoulli":
        return { type: "bernoulli", params: { p: parseFloat(p) || 0.5 } as Record<string, number> };
      case "Exponential":
        return { type: "exponential", params: { lam: parseFloat(lam) || 1 } as Record<string, number> };
    }
  };

  useEffect(() => {
  if (pendingVariable) {
    setPendingVariable(null);
    setZeroCoeffWarning(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [name, selectedParents, coeffs, noiseCoeff, distribution, mean, std, min, max, p, lam]);

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    for (const pid of selectedParents) {
      const raw = coeffs[pid];
      if (raw === undefined || raw.trim() === "" || isNaN(parseFloat(raw))) {
        setError(`Enter a valid coefficient for ${existingVariables.find((v) => v.id === pid)?.name}.`);
        return;
      }
    }
    if (noiseCoeff.trim() === "" || isNaN(parseFloat(noiseCoeff))) {
      setError(`Enter a valid coefficient for ${noiseName}.`);
      return;
    }
    
    const nameCollision = existingVariables.some(
        (v) => v.id !== initialVariable?.id && v.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (nameCollision) {
        setError(`A variable named "${trimmedName}" already exists.`);
        return;
      }

    const distError = validateDistribution();
    if (distError) {
      setError(distError);
      return;
    }

    const zeroParents = selectedParents.filter((pid) => parseFloat(coeffs[pid]) === 0);
    const effectiveParents = selectedParents.filter((pid) => parseFloat(coeffs[pid]) !== 0);

    if (zeroParents.length > 0) {
      const zeroNames = zeroParents.map((pid) => existingVariables.find((v) => v.id === pid)?.name).join(", ");
      setZeroCoeffWarning(`${zeroNames} removed as a parent, a coefficient of 0 means no causal relationship.`);
    } else {
      setZeroCoeffWarning(null);
    }

    setError(null);

    const variable: SCMVariable = {
      id: newId,
      name: trimmedName,
      dependencies: effectiveParents,
      coefficients: Object.fromEntries(effectiveParents.map((pid) => [pid, parseFloat(coeffs[pid])])),
      intercept: initialVariable?.intercept ?? 0,
      noise: { key: noiseKey, name: noiseName, distribution: buildDistribution() },
      noise_coefficient: parseFloat(noiseCoeff),
    };

    // handles case where user inputs 0 as coeff -> no causal relation -> remove as dependency
    if (zeroParents.length > 0) {
      const zeroNames = zeroParents.map((pid) => existingVariables.find((v) => v.id === pid)?.name).join(", ");
      setZeroCoeffWarning(`${zeroNames} will be removed as a parent: a coefficient of 0 means no causal relationship. Add anyway?`);
      setPendingVariable(variable);
      return;
  }
  onAdd(variable);

  };

  const handleConfirmPending = () => {
    if (!pendingVariable) return;
    onAdd(pendingVariable);
    setPendingVariable(null);
    setZeroCoeffWarning(null);
  };

  // validates distribution inputs frontend (also handled in backend but is silent, does not alert user)
  const validateDistribution = (): string | null => {
    switch (distribution) {
      case "Normal": {
        const s = parseFloat(std);
        if (isNaN(s) || s <= 0) return "Standard deviation must be a positive number.";
        if (isNaN(parseFloat(mean))) return "Mean must be a number.";
        return null;
      }
      case "Uniform": {
        const mn = parseFloat(min), mx = parseFloat(max);
        if (isNaN(mn) || isNaN(mx)) return "Min and max must be numbers.";
        if (mn >= mx) return "Min must be less than max.";
        return null;
      }
      case "Bernoulli": {
        const pv = parseFloat(p);
        if (isNaN(pv) || pv < 0 || pv > 1) return "Probability (p) must be between 0 and 1.";
        return null;
      }
      case "Exponential": {
        const lv = parseFloat(lam);
        if (isNaN(lv) || lv <= 0) return "Rate (λ) must be a positive number.";
        return null;
      }
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        {isEdit ? <Pencil size={16} className="text-slate-600" /> : <Plus size={16} className="text-slate-600" />}
        <span className="text-[15px] font-bold text-slate-800">{isEdit ? "Edit Variable" : "New Variable"}</span>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-bold text-slate-600">Name</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700 focus:border-slate-400 focus:outline-none"
        />
      </div>

      {!isFirstVariable ? (
        <div className="mb-4">
          <div className="mb-1.5 text-[13px] font-bold text-slate-600">Parents</div>
          <div className="flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 focus-within:border-slate-400">
            {selectedParents.map((pid) => {
              const parent = existingVariables.find((v) => v.id === pid);
              return (
                <span
                  key={pid}
                  onClick={() => toggleParent(pid)}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <Check size={12} strokeWidth={3} /> {parent?.name}
                </span>
              );
            })}
            <select
              value=""
              onChange={(e) => { if (e.target.value) toggleParent(e.target.value); }}
              className="flex-1 bg-transparent px-1 text-[13px] text-slate-600 focus:outline-none"
            >
              <option value="" disabled>Add parent...</option>
              {existingVariables.filter((v) => !selectedParents.includes(v.id)).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
            What causally affects your new variable? Click or start typing to see list of available variables.
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11.5px] leading-snug text-slate-500">
            This is the first variable, so it has no dependencies. You can edit this later after you create new variables.
          </p>
        </div>
      )}

      <div className="mb-4">
        <div className="mb-2 text-[13px] font-bold text-slate-600">Noise</div>
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2">
            <div className="mb-1 text-[11px] font-medium text-slate-500">Distribution</div>
            <select
              value={distribution}
              onChange={(e) => setDistribution(e.target.value as typeof distribution)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option>Normal</option>
              <option>Uniform</option>
              <option>Bernoulli</option>
              <option>Exponential</option>
            </select>
          </div>

          {distribution === "Normal" && (
            <>
              <div className="col-span-1">
                <div className="mb-1 text-[11px] font-medium text-slate-500">Mean</div>
                <input type="number" step="any" value={mean} onChange={(e) => setMean(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <div className="mb-1 text-[11px] font-medium text-slate-500">Std. Dev.</div>
                <input type="number" step="any" value={std} onChange={(e) => setStd(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
              </div>
            </>
          )}

          {distribution === "Uniform" && (
            <>
              <div className="col-span-1">
                <div className="mb-1 text-[11px] font-medium text-slate-500">Min</div>
                <input type="number" step="any" value={min} onChange={(e) => setMin(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
              </div>
              <div className="col-span-1">
                <div className="mb-1 text-[11px] font-medium text-slate-500">Max</div>
                <input type="number" step="any" value={max} onChange={(e) => setMax(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
              </div>
            </>
          )}

          {distribution === "Bernoulli" && (
            <div className="col-span-2">
              <div className="mb-1 text-[11px] font-medium text-slate-500">Probability (p)</div>
              <input type="number" step="0.01" min="0" max="1" value={p} onChange={(e) => setP(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
            </div>
          )}

          {distribution === "Exponential" && (
            <div className="col-span-2">
              <div className="mb-1 text-[11px] font-medium text-slate-500">Rate (λ)</div>
              <input type="number" step="any" min="0" value={lam} onChange={(e) => setLam(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 text-[13px] font-bold text-slate-600">Equation</div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[14px] text-slate-700">
          {selectedParents.map((pid, i) => {
            const parent = existingVariables.find((v) => v.id === pid);
            return (
              <span key={pid} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-400">+</span>}
                <input
                  type="number"
                  step="any"
                  value={coeffs[pid] ?? ""}
                  onChange={(e) => setCoeffs((prev) => ({ ...prev, [pid]: e.target.value }))}
                  className="w-12 rounded border border-slate-200 bg-white px-1 py-1 text-center focus:border-slate-400 focus:outline-none"
                />
                <span>{parent?.name}</span>
              </span>
            );
          })}
          {selectedParents.length > 0 && <span className="text-slate-400">+</span>}
          <span className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              value={noiseCoeff}
              onChange={(e) => setNoiseCoeff(e.target.value)}
              className="w-12 rounded border border-slate-200 bg-white px-1 py-1 text-center focus:border-slate-400 focus:outline-none"
            />
            <span>{noiseName}</span>
          </span>
        </div>
      </div>

      {error && <p className="mb-3 text-[12px] font-medium text-rose-500">{error}</p>}
      {zeroCoeffWarning && (
        <p className="mb-3 text-[12px] font-medium text-amber-600">{zeroCoeffWarning}</p>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-rose-200 bg-white py-2 text-[13px] font-semibold text-rose-500 transition-colors hover:bg-rose-50">
          Cancel
        </button>
        <button
          onClick={pendingVariable ? handleConfirmPending : handleSubmit}
          className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}