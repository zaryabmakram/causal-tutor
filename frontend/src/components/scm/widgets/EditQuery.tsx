"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { SCMVariable } from "@/types";

interface EditQueryPanelProps {
  variables: SCMVariable[];
  observedValues: Record<string, number>;
  currentInterveneId: string;
  currentInterveneValue: number;
  currentQueryId: string;
  onCancel: () => void;
  onConfirm: (interveneId: string, interveneValue: number, queryId: string) => void;
}

export default function EditQueryPanel({
  variables, observedValues, currentInterveneId, currentInterveneValue, currentQueryId, onCancel, onConfirm,
}: EditQueryPanelProps) {
  const [interveneId, setInterveneId] = useState(currentInterveneId);
  const [newValue, setNewValue] = useState(String(currentInterveneValue));
  const [queryId, setQueryId] = useState(currentQueryId);

  const observedVal = observedValues[interveneId];

  const handleConfirm = () => {
    const parsed = parseFloat(newValue);
    if (isNaN(parsed)) return;
    onConfirm(interveneId, parsed, queryId);
  };

  const OBSERVED_BORDER_FONT_COLOR = "#285E7B";
  const CF_BORDER_FONT_COLOR = "#BF9565";
  
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 rounded-lg border bg-[#FFF7E2] px-4 py-2" style={{ borderColor: CF_BORDER_FONT_COLOR }}>
      <div className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-slate-600">
        <span className="flex-shrink-0 font-semibold" style={{ color: CF_BORDER_FONT_COLOR }}>
          Change Active Query:
        </span>
        <span className="flex-shrink-0 font-regular text-slate-500">If</span>
        <select
          value={interveneId}
          onChange={(e) => setInterveneId(e.target.value)}
          className="rounded-md border border-slate-400 bg-white px-2 py-1 font-mono text-[13px] font-semibold text-slate-00 focus:border-slate-400 focus:outline-none"
        >
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <span className="flex-shrink-0 font-regular text-slate-500  ">had been</span>
        <input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="w-16 rounded-md border border-slate-400 bg-white px-2 py-1 text-center font-mono text-[13px] text-slate-700 focus:border-slate-400 focus:outline-none"
        />
        <span className="flex-shrink-0 font-regular text-slate-500">instead of</span>
        <span
          className="rounded-md border px-2 py-1 font-mono text-[13px] font-semibold"
          style={{ borderColor: OBSERVED_BORDER_FONT_COLOR, color: OBSERVED_BORDER_FONT_COLOR, backgroundColor: `#FFFFFF` }}
        >
          {observedVal?.toFixed(1)}
        </span>
        <span className="flex-shrink-0 font-regular text-slate-500">what would the value of</span>
        <select
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
          className="rounded-md border border-slate-400 bg-white px-2 py-1 font-mono text-[13px] font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
        >
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <span className="flex-shrink-0 font-regular text-slate-500">be?</span>
      </div>

      <div className="flex flex-shrink-0 gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ChevronLeft size={13} /> Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!newValue.trim() || isNaN(parseFloat(newValue))}
          className="rounded-md border px-3 py-1 text-[12px] font-semibold bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#fff8ee]"
          style={{ borderColor: CF_BORDER_FONT_COLOR, color: CF_BORDER_FONT_COLOR }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}