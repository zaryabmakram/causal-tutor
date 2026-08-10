"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, ArrowRight } from "lucide-react";
import NewVariablePanel from "@/components/scm/widgets/newVar";
import type { SCMVariable, SCMSchema } from "@/types";

interface SCMSandboxProps {
  onCreateSchema: (schema: SCMSchema) => void;
  onContextChange?: (ctx: any) => void;
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const toSubscript = (n: number) => String(n).split("").map((d) => SUBSCRIPTS[+d]).join("");

export default function SCMSandbox({ onCreateSchema, onContextChange }: SCMSandboxProps) {
  const [variables, setVariables] = useState<SCMVariable[]>([]);
  const [panelMode, setPanelMode] = useState<"none" | "add" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);


  const handleAdd = (v: SCMVariable) => {
    setVariables((prev) => [...prev, v]);
    setPanelMode("none");
  };

  const handleEdit = (updated: SCMVariable) => {
    setVariables((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setPanelMode("none");
    setEditingId(null);
  };

  const editingVar = variables.find((v) => v.id === editingId) ?? null;

  const openEdit = (id: string) => {
    setEditingId(id);
    setPanelMode("edit");
  };

  const openAdd = () => setPanelMode("add");
  const closePanel = () => { setPanelMode("none"); setEditingId(null); };

  const handleCreate = () => {
    onCreateSchema({ id: `sandbox-${Date.now()}`, name: "My SCM", variables });
  };

  useEffect(() => {
    if (!onContextChange) return;
    onContextChange({
      draftVariableCount: variables.length,
      draftVariables: variables.map((v) => ({
        name: v.name,
        dependencies: v.dependencies.map((d) => variables.find((p) => p.id === d)?.name),
        noiseType: v.noise.distribution.type,
      })),
      currentlyEditing: editingId ? variables.find((v) => v.id === editingId)?.name : null,
      panelOpen: panelMode,
    });
  }, [variables, editingId, panelMode, onContextChange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-8 pb-10 pt-6">
        <h2 className="mb-1 text-[17px] font-bold text-slate-600">Create a new structural causal model</h2>
        <p className="mb-8 text-[13px] text-slate-500">
        Start by defining your variables, their structural equations, and their noise distributions.
        </p>

    <div className="mx-auto flex w-full max-w-6xl items-start justify-center gap-4">
        {panelMode === "edit" && editingVar && (
          <div className="w-[320px] flex-shrink-0">
            <NewVariablePanel
              existingVariables={variables.filter((v) => v.id !== editingVar.id)}
              isFirstVariable={false}
              initialVariable={editingVar}
              mode="edit"
              onCancel={closePanel}
              onAdd={handleEdit}
            />
          </div>
        )}

        <div className="w-full max-w-2xl flex-1">
          <h2 className="mb-4 text-lg font-bold tracking-tight text-[#4F70B0]">Your SCM</h2>

          {variables.length === 0 ? (
            <div className="flex h-[120px] w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#8BA3D1] bg-[#F2F6FE] text-[13px] text-slate-400">
              You have not added any variables yet.
            </div>
          ) : (
            <div className="relative w-full rounded-xl border-[1.5px] border-dashed border-[#8BA3D1] bg-[#F2F6FE] px-6 py-4 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping [animation-duration:2s] rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[17px] font-semibold text-[#374E74]">Active Variables</span>
                </div>
                <span className="font-serif text-xl font-bold italic text-[#4F70B0]">
                  P<sub className="ml-[1px] text-sm font-bold">
                    {variables.map((_, i) => `N${toSubscript(i + 1)}`).join(",")}
                  </sub>
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-4 font-mono">
                {variables.map((v, i) => (
                  <div key={v.id} className="contents">
                    <div className="flex items-center gap-3 pl-2">
                      <button onClick={() => openEdit(v.id)} className="text-slate-400 hover:text-slate-600">
                        <Pencil size={12} />
                      </button>
                      <span className="text-[16px] font-bold text-[#395A96]">{v.name}</span>
                      <span className="text-[16px] text-[#94A3B8]">←</span>
                      <span className="text-[16px] text-[#395A96]">
                        f{toSubscript(i + 1)}(
                        {[...v.dependencies.map((d) => variables.find((p) => p.id === d)?.name), v.noise.name].join(", ")}
                        )
                      </span>
                    </div>
                    {i === 0 && (
                      <div
                        className="w-[1px] justify-self-center bg-[#8BA3D1]/40"
                        style={{ gridRow: `span ${variables.length}` }}
                      />
                    )}
                    <div className="flex items-center justify-self-end rounded-lg border border-[#CBD5E1] bg-white px-4 py-1.5 text-[14px] text-[#64748B] shadow-sm">
                        <span className="mr-2 font-semibold text-[#94A3B8]">{v.noise.name} ~</span>
                        {v.noise.distribution.type.charAt(0).toUpperCase() + v.noise.distribution.type.slice(1)} ({Object.values(v.noise.distribution.params).join(", ")})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={openAdd}
              disabled={panelMode !== "none"}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
              Add Variable
            </button>

            {variables.length > 0 && (
              <button
                onClick={handleCreate}
                disabled={panelMode !== "none"}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/80 bg-emerald-50 px-5 py-2.5 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Looks good, create SCM
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {panelMode === "add" && (
          <div className="w-[320px] flex-shrink-0">
            <NewVariablePanel
              existingVariables={variables}
              isFirstVariable={variables.length === 0}
              onCancel={closePanel}
              onAdd={handleAdd}
            />
          </div>
        )}
      </div>
    </div>
  );
}