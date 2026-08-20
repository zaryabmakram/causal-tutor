"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, Trash2, Plus, Pencil, HelpCircle, Share2Icon, MousePointerClick } from "lucide-react";
import { Hoverable } from "@/components/scm/widgets/Hoverable";
import { sampleScmSchema, type SCMVariableResult } from "@/lib/api";
import { edgesFromSchema } from "@/types";
import { formatEquation, formatInputs, formatDistribution, formatFunctionalForm } from "@/lib/scmdisplay";
import Histogram from "@/components/scm/plots/Histogram";
import JointDistribution from "@/components/scm/plots/JointDist";
import NewVariablePanel from "@/components/scm/widgets/newVar";
import InterventionPanel from "@/components/scm/widgets/intervPopup";
import ResizablePanels from "@/components/scm/widgets/ResizablePanels";
import type { Intervention, SCMSchema, SCMVariable } from "@/types";
import SCMDAGView from "./widgets/SCMDAGView";

interface SCMObservationalTabProps {
  schema: SCMSchema;
  onAddVariable: (v: SCMVariable, childIds: string[]) => void;
  onEditVariable: (v: SCMVariable, childIds: string[]) => void;
  onDeleteVariable: (id: string) => void;
  onInterventionCreated: (iv: Intervention) => void;
  onContextChange?: (ctx: any) => void;
}

export default function SCMObservationalTab({ schema, onAddVariable, onEditVariable, onDeleteVariable, onInterventionCreated, onContextChange }: SCMObservationalTabProps) {
  const variables = schema.variables;
  const DEFAULT_SAMPLE_SIZE = 500;

  const [sampleSize, setSampleSize] = useState(DEFAULT_SAMPLE_SIZE);
  const [selectedVarId, setSelectedVarId] = useState(variables[0]?.id ?? "");
  const [results, setResults] = useState<Record<string, SCMVariableResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const sampleCache = useRef<Map<string, Record<string, SCMVariableResult>>>(new Map());
  const [distTab, setDistTab] = useState<"Marginal" | "Joint">("Marginal");
  const [showNewVariable, setShowNewVariable] = useState(false);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [showIntervention, setShowIntervention] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [popupOffset, setPopupOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPopup, setIsDraggingPopup] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const dagContainerRef = useRef<HTMLDivElement | null>(null);

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const handleWindowPointerMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    const popupEl = popupRef.current;
    const containerEl = dagContainerRef.current;
    if (!drag || !popupEl || !containerEl) return;

    const popupW = popupEl.offsetWidth;
    const popupH = popupEl.offsetHeight;
    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    const bottomOffset = 32;

    const maxX = (cw - popupW) / 2;
    const minY = bottomOffset + popupH - ch;

    setPopupOffset({
      x: clamp(drag.startOffset.x + (e.clientX - drag.startX), -maxX, maxX),
      y: clamp(drag.startOffset.y + (e.clientY - drag.startY), minY, bottomOffset),
    });
  };

  const handleWindowPointerUp = () => {
    dragRef.current = null;
    setIsDraggingPopup(false);
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerUp);
  };

  const handlePopupPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, select, button, textarea, a")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: popupOffset,
    };
    setIsDraggingPopup(true);
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  };

  useEffect(() => {
    const cacheKey = `${schema.id}:${sampleSize}`;
    const cached = sampleCache.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    sampleScmSchema(schema, sampleSize)
      .then((res) => {
        if (!cancelled) {
          sampleCache.current.set(cacheKey, res.results);
          setResults(res.results);
        }
      })
      .catch((err) => console.error("Sampling failed", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [schema, sampleSize]);

  const selected = results?.[selectedVarId];
  const newVarRef = useRef<HTMLDivElement>(null);
  const editVarRef = useRef<HTMLDivElement>(null);
  const editingVar = variables.find((v) => v.id === editingVarId) ?? null;

  useEffect(() => {
    if (editingVarId) {
      // timeout to ensure panel is loaded before scrolling down
      setTimeout(() => {
        editVarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [editingVarId]);

  useEffect(() => {
    if (showNewVariable) {
      // timeout to ensure panel is loaded before scrolling down
      setTimeout(() => {
        newVarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 50);
    }
  }, [showNewVariable]);

  useEffect(() => {
    if (!onContextChange) return;
    onContextChange({
      sampleSize,
      selectedVariable: variables.find((v) => v.id === selectedVarId)?.name,
      distributionView: distTab,
      stats: results?.[selectedVarId]?.stats ?? null,
    });
  }, [sampleSize, selectedVarId, distTab, results, onContextChange]);

 return (
    <ResizablePanels>
      {/* SCM */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-[45px] flex-shrink-0 items-center gap-3 bg-[#ffffff] border-b border-slate-200 px-4">
          <span className="font-serif text-sm font-semibold italic text-slate-500">ƒx</span>
          <span className="text-[14px] font-bold text-slate-600">Structural Causal Model</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          
          <div className="flex items-center gap-3 px-4 py-4 text-[14px] font-mono font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {variables.map((v) => v.noise.name).join(", ")}
          </div>

          <div className="flex flex-col gap-3 px-3 pb-3">
            {variables.map((v, i) => {
              const equationDisplay = results?.[v.id]?.equation_display ?? formatEquation(v, schema);
              return (
               <div key={v.id} className="relative rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[14px] font-bold text-slate-800">{v.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingVarId(v.id)}
                      className="text-slate-400 transition-colors hover:text-slate-600"
                      title="Edit variable"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(v.id)}
                      className="text-rose-400 transition-colors hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {confirmDeleteId === v.id && (
                    <div className="absolute inset-x-0 top-0 z-30 rounded-lg  bg-white p-3 shadow-lg">
                      <p className="mb-3 text-[12.5px] text-slate-600">
                        Delete <span className="font-semibold">{v.name}</span>? This also removes it from any dependent equations.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-md border border-slate-200 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50">
                          Cancel
                        </button>
                        <button
                          onClick={() => { onDeleteVariable(v.id); setConfirmDeleteId(null); }}
                          className="flex-1 rounded-md border border-rose-200 bg-rose-50 py-1.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 font-mono text-[14px] text-slate-500">
                      ← {formatFunctionalForm(v, i, { variables } as SCMSchema)}
                    </span>
                    <span className="flex-shrink-0 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                      <span className="font-semibold text-slate-500">{v.noise.name}</span> ~ {formatDistribution(v.noise.distribution)}
                    </span>
                  </div>

                  <div className="rounded-md border border-[#E4E9F5] bg-[#F6F8FD] px-2.5 py-1.5 font-mono text-[14px] text-[#4F70B0]">
                    := {equationDisplay}
                  </div>
                </div>
              );
            })}
          </div>

          {editingVar && (
            <div ref={editVarRef} className="mx-3 pt-3">
              <div className="mb-3 border-t border-slate-200" />
              <NewVariablePanel
                key={editingVar.id}
                existingVariables={variables.filter((v) => v.id !== editingVar.id)}
                isFirstVariable={false}
                initialVariable={editingVar}
                mode="edit"
                onCancel={() => setEditingVarId(null)}
                onAdd={(updated, childIds) => {
                  onEditVariable(updated, childIds);
                  setEditingVarId(null);
                }}
              />
            </div>
          )}

          <div ref={newVarRef} className="mx-3 border-t border-slate-100 pt-3 pb-8">
            {!showNewVariable ? (
              <button
                onClick={() => setShowNewVariable(true)}
                disabled={!!editingVar}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-400 bg-slate-50 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
                Add Variable
              </button>
            ) : (
              <NewVariablePanel
                existingVariables={variables}
                onCancel={() => setShowNewVariable(false)}
                onAdd={(newVar, childIds) => {
                  onAddVariable(newVar, childIds);
                  setShowNewVariable(false);
                }}
              />
            )}
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

        <div ref={dagContainerRef} className="relative flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden">
          <SCMDAGView variables={variables} />

        {showIntervention && (
          <div
            ref={popupRef}
            className={`absolute bottom-8 left-1/2 z-40 touch-none ${
              isDraggingPopup ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
            style={{ transform: `translate(-50%, 0) translate(${popupOffset.x}px, ${popupOffset.y}px)` }}
            onPointerDown={handlePopupPointerDown}
          >
          <InterventionPanel
              variables={variables}
              onCancel={() => {
                setShowIntervention(false);
                setPopupOffset({ x: 0, y: 0 });
              }}
              onRun={(iv) => {
                onInterventionCreated(iv);
                setShowIntervention(false);
                setPopupOffset({ x: 0, y: 0 });
              }}
            />
          </div>
        )}
      </div>

      <div className="flex w-full flex-shrink-0 justify-center border-t border-slate-50 py-3">
          <button 
            onClick={() => setShowIntervention(true)}
            className="flex w-[350px] max-w-md items-center justify-between gap-2 rounded-full border border-slate-400 bg-[#f0f4ff] px-6 py-3 text-[15px] font-medium text-slate-600 transition-colors hover:bg-[#e0e8ff]"
          >
            <span className="flex items-center gap-2">
              <MousePointerClick size={17} className="text-slate-600" />
              Create an Intervention
            </span>

            <Hoverable 
              title="Intervention Info" 
              description="Intervene on a variable to see how it affects the rest of the system."
              side="top"
            >
              <HelpCircle size={17} className="text-slate-400 cursor-help" />
            </Hoverable>
            
          </button>
        </div>
      </div>

      {/*  Distributions */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">

        <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <BarChart2 size={15} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">Distributions</span>
        </div>

        <div className="flex flex-shrink-0 gap-5 border-b border-slate-100 px-4 pt-3 text-[12px] font-semibold">
          <button
            onClick={() => setDistTab("Marginal")}
            className={
              distTab === "Marginal"
                ? "border-b-2 border-slate-600 pb-2.5 text-slate-600"
                : "pb-2.5 text-slate-400 hover:text-slate-600"
            }
          >
            Marginal
          </button>
          <button
            onClick={() => setDistTab("Joint")}
            className={
              distTab === "Joint"
                ? "border-b-2 border-slate-600 pb-2.5 text-slate-600"
                : "pb-2.5 text-slate-400 hover:text-slate-600"
            }
          >
            Joint
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          
          {distTab === "Marginal" ? (
            <>
            <div className="flex w-full min-w-0 flex-shrink-0 gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
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

              <div className="mx-4 rounded-lg border border-slate-100 p-4">
                {loading || !selected ? (
                  <div className="flex h-32 items-center justify-center text-[12px] text-slate-300">Sampling...</div>
                ) : (
                  <Histogram histogram={selected.histogram} kde={selected.kde} />
                )}
              </div>

              <div className="mt-3 flex flex-col divide-y divide-slate-100 px-4">
                {[
                  ["Mean", selected?.stats.mean],
                  ["Standard Deviation", selected?.stats.std],
                  ["Skew", selected?.stats.skew],
                  ["Kurtosis", selected?.stats.kurtosis],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between py-2.5 text-[14px]">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-mono text-slate-700">
                      {typeof value === "number" ? value.toFixed(2) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-5">
                <div className="mb-2 flex items-center justify-between text-[14px]">
                  <span className="text-slate-500">Sample Size (n)</span>
                  <span className="font-mono font-semibold text-[#4F70B0]">{sampleSize}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full accent-slate-800"
                />
              </div>
            </>
          ) : (
            <JointDistribution
              variables={variables}
              getSamples={(id) => results?.[id]?.raw_samples}
              sampleSize={sampleSize}
              onSampleSizeChange={setSampleSize}
              loading={loading}
            />
          )}
        </div>
      </div>
    </ResizablePanels>
  );
}