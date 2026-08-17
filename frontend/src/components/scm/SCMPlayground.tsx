"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, RotateCcw, Share2, X, Plus} from "lucide-react";
import SCMIcon from "@/components/assets/SCMicon";
import SCMOverview from "@/components/scm/SCMOverview";
import SCMObservationalTab from "@/components/scm/SCMObservational";
import { Hoverable } from "@/components/scm/widgets/Hoverable";
import { edgesFromSchema } from "@/types";
import type { Intervention, SCMSchema, SCMVariable } from "@/types";
import SCMInterventionalTab from "@/components/scm/SCMInterventional";
import SCMCounterfactualTab, { type CounterfactualSession } from "@/components/scm/SCMCounterfactual";
import SCMSandbox from "./SCMSandbox";
import { SCM_EXAMPLES, type SCMExampleMeta } from "@/data/example-scms";


interface SCMPlaygroundProps {
  compactToolbar?: boolean;
  onContextChange?: (ctx: { feature: "scm"; payload: any }) => void;
}

// building basics panel 
function SCMBasicsPanel({
  onOpenExamples,
  onAddVariable,
  onDismiss,
}: {
  onOpenExamples: () => void;
  onAddVariable: () => void;
  onDismiss: () => void;
}) {
  const concepts = [
    {
      title: "What is an SCM?",
      body: "A Structural Causal Model (SCM) defines each variable as a function of its direct causes plus an independent noise term, and this the mechanism generating your data.",
    },
    {
      title: "Why noise terms?",
      body: "Noise represents everything unmeasured that affects a variable. Every variable has an independent noise drawn from a distribution that you get to choose. These noises are assumed to be independent of each other.",
    },
    { 
      title: "Observational vs. Interventional",
      body: "Observational data shows what naturally happens, while interventional data shows what happens when you force a variable to a value, breaking its natural causes.",
    },
    {
      title: "What is a counterfactual?",
      body: "A counterfactual asks what would have happened to one specific observed unit, had one variable been different, while holding everything else about that unit fixed.",
    },
  ];

  const steps = [
    "Add variables and define their structural equations.",
    "Set each variable's noise distribution.",
    "Explore observational data and distributions.",
    "Run an intervention to see population-level effects.",
    "Build a counterfactual query for a specific observation, and explore its implications.",
  ];

  return (
    <div className="w-[min(860px,calc(100vw-3rem))] max-h-[min(78vh,680px)] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl">
      <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">SCM Basics</h2>
            <p className="text-base text-slate-500 leading-relaxed mt-1.5">
              Use this playground to build and explore structural causal models.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Dismiss SCM basics"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {concepts.map((concept) => (
            <div key={concept.title} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
              <p className="text-base font-semibold text-slate-900 mb-1.5">{concept.title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{concept.body}</p>
            </div>
          ))}
        </div>

        <div className="border border-violet-100 bg-violet-100/70 rounded-xl p-5">
          <p className="text-base font-semibold text-slate-900 mb-4">How to use this playground</p>
          <ol className="space-y-2.5">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-white border border-violet-200 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={onOpenExamples}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple-950 text-white text-sm font-medium hover:bg-black transition-colors"
            >
              <Share2 size={16}/>
              Load example
            </button>
            <button
              type="button"
              onClick={onAddVariable}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Plus size={16} />
              Build my own SCM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function SCMPlayground({ compactToolbar = false, onContextChange }: SCMPlaygroundProps) {
  const [activeTab, setActiveTab] = useState<"Overview" | "Observational" | "Interventional" | "Counterfactual" | "Sandbox">(
    "Overview"
  );
  const [schema, setSchema] = useState<SCMSchema | null>(null);
  const [defaultSchema, setDefaultSchema] = useState<SCMSchema | null>(null);
  const [exampleDropdownOpen, setExampleDropdownOpen] = useState(false);
  const exampleDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exampleDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exampleDropdownRef.current && !exampleDropdownRef.current.contains(e.target as Node)) {
        setExampleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exampleDropdownOpen]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasIntervention, setHasIntervention] = useState(false);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const SCM_BASICS_SEEN_KEY = "scm-basics-seen";
  const [showBasicsPanel, setShowBasicsPanel] = useState(false);
  const [basicsDismissed, setBasicsDismissed] = useState(false);
  const [resetToken, setResetToken] = useState(0);


  const applyIntervention = (iv: Intervention) => {
    setIntervention(iv);
    setHasIntervention(true);
    setActiveTab("Interventional");
  };

  const [obsContext, setObsContext] = useState<any>(null);
  const [cfContext, setCfContext] = useState<any>(null);
  const [sandboxContext, setSandboxContext] = useState<any>(null);
  const [cfSession, setCfSession] = useState<CounterfactualSession | null>(null);

  useEffect(() => {
    if (!schema || !onContextChange) return;
    onContextChange({
      feature: "scm",
      payload: {
        schema,
        activeTab,
        intervention,
        observational: activeTab === "Observational" ? obsContext : null,
        counterfactual: activeTab === "Counterfactual" ? cfContext : null,
        sandbox: activeTab === "Sandbox" ? sandboxContext : null,
      },
    });
  }, [schema, activeTab, intervention, obsContext, cfContext, sandboxContext, onContextChange]);

  useEffect(() => {
      if (typeof window === "undefined") return;
      const seen = window.localStorage.getItem(SCM_BASICS_SEEN_KEY);
      if (!seen) {
        setShowBasicsPanel(true);
      } else {
        setBasicsDismissed(true);
      }
    }, []);

  const loadExample = (example: SCMExampleMeta) => {
    setSchema(example.schema);
    setDefaultSchema(example.schema);
    clearIntervention();
    setCfSession(null);
    setResetToken((t) => t + 1);
    setExampleDropdownOpen(false);
    setActiveTab((current) =>
      current === "Observational" || current === "Counterfactual" ? current : "Overview"
    );
  };

  const dismissBasics = () => {
    setShowBasicsPanel(false);
    setBasicsDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SCM_BASICS_SEEN_KEY, "true");
    }
  };

  const openBasicsFromButton = () => {
    setShowBasicsPanel(true);
  };

  const openExamplesFromBasics = () => {
    dismissBasics();
    setExampleDropdownOpen(true);
  };

  const openAddVariableFromBasics = () => {
    dismissBasics();
    setExampleDropdownOpen(false);
    setActiveTab("Sandbox");
  };

    
  const clearIntervention = () => {
    setIntervention(null);
    setHasIntervention(false);
  };

  const addVariable = (newVar: SCMVariable) => {
    setSchema((prev) => (prev ? { ...prev, variables: [...prev.variables, newVar] } : prev));
    clearIntervention();
    setCfSession(null);
  };

  const deleteVariable = (varId: string) => {
    setSchema((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variables: prev.variables
          .filter((v) => v.id !== varId)
          .map((v) => ({
            ...v,
            dependencies: v.dependencies.filter((d) => d !== varId),
            coefficients: Object.fromEntries(
              Object.entries(v.coefficients).filter(([k]) => k !== varId)
            ),
          })),
      };
    });
    setCfSession(null);
  };

  const resetSchema = () => {
    if (!defaultSchema) return;
    setSchema(defaultSchema);
    clearIntervention();
    setCfSession(null);
    setResetToken((t) => t + 1);
  };

  const variables = schema?.variables ?? [];
  const edges = schema ? edgesFromSchema(schema) : [];

  return (
    <div className="flex h-full w-full select-none overflow-hidden bg-white text-sm text-slate-700">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="z-20 flex h-14 flex-shrink-0 items-center gap-2 px-4 border-b border-slate-200 bg-white">
          <div className="mr-4 flex flex-shrink-0 items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg p-1.5"
              style={{ backgroundColor: "rgba(167, 139, 250, 0.1)" }}
            >
              <SCMIcon className="h-[18px] w-[18px]" style={{ color: "#A78BFA" }} />
            </div>
            {!compactToolbar && (
              <h1 className="font-bold text-slate-800 text-sm whitespace-nowrap">SCM Playground</h1>
            )}
          </div>

          <button
            onClick={openBasicsFromButton}
            title="SCM basics"
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm border ${
              showBasicsPanel
                ? "border-violet-300 bg-violet-50 text-violet-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <BookOpen size={14} />
            {!compactToolbar && <span>Basics</span>}
          </button>

          {/* examples + dropdown */}
          <div ref={exampleDropdownRef} className="relative flex-shrink-0">
            <button
              onClick={() => setExampleDropdownOpen((o) => !o)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              Examples <ChevronDown size={14} />
            </button>
            {exampleDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                {SCM_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => loadExample(ex)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <div className="font-medium text-sm text-slate-800">{ex.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{ex.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/*reset SCM -> go back to unedited curr schema (i.e. first created version of SCM in sandbox or default version of picked example -> no added/removed variables, no changes*/}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => defaultSchema && setShowResetConfirm(true)}
                disabled={!defaultSchema}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <RotateCcw size={18} />
              </button>

              {showResetConfirm && (
                <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-3 text-[12.5px] text-slate-600">
                    Reset the SCM? This will revert to the default schema and discard any changes you've made.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 rounded-md border border-slate-200 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { resetSchema(); setShowResetConfirm(false); }}
                      className="flex-1 rounded-md border border-rose-200 bg-rose-50 py-1.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* tab bar */}
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
          <nav className="flex h-full items-center gap-8">
            {(["Overview", "Observational", "Interventional", "Counterfactual"] as const).map((tab) => {
              // Lock interventional tab if no intervention exists
              const isLocked = tab === "Interventional" && !hasIntervention;
              
              const tabButton = (
                <button
                  key={tab}
                  onClick={() => !isLocked && setActiveTab(tab)}
                  disabled={isLocked}
                  className={`relative h-full text-sm font-semibold transition-colors ${
                    isLocked
                      ? "cursor-not-allowed text-slate-300"
                      : activeTab === tab
                      ? "font-bold text-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                  {activeTab === tab && !isLocked && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-slate-800" />
                  )}
                </button>
              );

              // Wrap in hoverable
              return isLocked ? (
                <Hoverable 
                  key={tab} 
                  title="Locked" 
                  description="You need to create an intervention in the observational tab first!" 
                  side="bottom"
                >
                  {tabButton}
                </Hoverable>
              ) : (
                tabButton
              );
            })}

            {activeTab === "Sandbox" && (
              <button
                key="Sandbox"
                className="relative h-full text-sm font-bold text-emerald-700"
              >
                Sandbox
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-600" />
              </button>
            )}
          </nav>

         {activeTab !== "Sandbox" && (
          <button
            onClick={() => setActiveTab("Sandbox")}
            className="rounded-md border border-emerald-500/80 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100/70"
          >
            Sandbox
          </button>
         )}
        </div>

        <div
          className={`flex flex-1 min-h-0 flex-col justify-between bg-white ${
            activeTab === "Overview" ? "overflow-auto" : "overflow-hidden"
          }`}
        >
          <div
            className={`flex w-full flex-1 min-h-0 justify-center ${
              activeTab === "Overview" ? "overflow-x-auto overflow-y-auto pb-24 pt-4" : "overflow-hidden"
            }`}
          >
            {activeTab === "Sandbox" ? (
              <SCMSandbox
                onCreateSchema={(newSchema) => {
                  setSchema(newSchema);
                  setDefaultSchema(newSchema);
                  setActiveTab("Observational");
                }}
                onContextChange={setSandboxContext}
              />
            ) : !schema ? (
              <div className="mt-32 text-center">
                <SCMIcon className="mx-auto mb-4 h-22 w-22 text-slate-400" />
                <h2 className="mb-2 text-xl font-bold text-slate-400">Build Your Structural Causal Model</h2>
                <p className="mx-auto max-w-sm text-sm text-slate-400">
                  Load an example to explore a pre-built SCM, or head to the Sandbox to define your own variables and
                  equations from scratch.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setExampleDropdownOpen(true)}
                    className="rounded-lg bg-slate-400 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-500"
                  >
                    Load an example
                  </button>
                  <button
                    onClick={() => setActiveTab("Sandbox")}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Build my own SCM
                  </button>
                </div>
              </div>
            ) : activeTab === "Overview" ? (
                  <SCMOverview key={`${schema.id}-${resetToken}`} variables={variables} edges={edges} />
            ) : activeTab === "Observational" ? (
                  <SCMObservationalTab
                    key={`${schema.id}-${resetToken}`}
                    schema={schema}
                    onAddVariable={addVariable}
                    onDeleteVariable={deleteVariable}
                    onInterventionCreated={applyIntervention}
                    onContextChange={setObsContext}
                  />
              ) : activeTab === "Interventional" ? (
                      <SCMInterventionalTab key={`${schema.id}-${resetToken}`} schema={schema} intervention={intervention} />
            ) : activeTab === "Counterfactual" ? (
                      <SCMCounterfactualTab
                        key={`${schema.id}-${resetToken}`}
                        schema={schema}
                        session={cfSession}
                        onSessionChange={setCfSession}
                        onContextChange={setCfContext}
                      />
            ) : null}
          </div>

          {activeTab === "Overview" && schema && (
            <footer className="flex-shrink-0 border-t border-slate-100 bg-white px-8 py-6">
              <p className="max-w-6xl text-[14px] leading-relaxed text-slate-500">
                The blue dashed blocks represent unobservable ground truth. In reality, the exact causal mechanisms are
                hidden from us, but here, you can define them to simulate the system&apos;s behaviour.
              </p>
            </footer>
          )}

          {showBasicsPanel && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/20 px-4 rounded-tl-2xl">
              <SCMBasicsPanel
                onOpenExamples={openExamplesFromBasics}
                onAddVariable={openAddVariableFromBasics}
                onDismiss={dismissBasics}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}