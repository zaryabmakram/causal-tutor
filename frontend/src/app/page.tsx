"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import CausalTutor from "@/components/CausalTutor";
import CurriculumDashboard from "@/components/CurriculumDashboard";
import ApiKeySettings from "@/components/ApiKeySettings";
import TutorChatPanel, { type TutorFeature } from "@/components/TutorChatPanel";
import { BookOpen, FlaskConical, Share2, Database, KeyRound, MessageSquare } from "lucide-react";
import { useStoredKey } from "@/lib/apiKey";
import { API_KEY_MODAL_EVENT } from "@/lib/apiErrors";

const DAGPlayground = dynamic(() => import("@/components/DAGPlayground"), { ssr: false });
const DatasetSandbox = dynamic(() => import("@/components/DatasetSandbox"), { ssr: false });

export default function Home() {
  const [activeMode, setActiveMode] = useState<"lab" | "curriculum" | "playground" | "sandbox">("lab");
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const storedKey = useStoredKey();

  // ── Unified Tutor chat state (panel + current feature context) ──
  const [tutorChatOpen, setTutorChatOpen] = useState(false);
  const [featureContext, setFeatureContext] = useState<{ feature: TutorFeature; payload: any }>({
    feature: "general",
    payload: undefined,
  });
  // True while the user is mid-exam in Curriculum — hides FAB and force-closes the panel.
  const [chatLocked, setChatLocked] = useState(false);

  // Reset context to "general" when switching to Lab or Sandbox (which don't publish)
  useEffect(() => {
    if (activeMode === "lab" || activeMode === "sandbox") {
      setFeatureContext({ feature: "general", payload: undefined });
    }
    // For curriculum/playground, the child component publishes via onContextChange.
  }, [activeMode]);

  // Force-close the chat whenever it's locked (e.g., during an exam).
  useEffect(() => {
    if (chatLocked) setTutorChatOpen(false);
  }, [chatLocked]);

  const handleContextChange = useCallback(
    (ctx: { feature: TutorFeature; payload: any }) => setFeatureContext(ctx),
    []
  );
  const handleChatLockedChange = useCallback((locked: boolean) => setChatLocked(locked), []);

  // Open the API key modal when any OpenAI-using request returns 401
  useEffect(() => {
    const handler = () => setApiKeyOpen(true);
    window.addEventListener(API_KEY_MODAL_EVENT, handler);
    return () => window.removeEventListener(API_KEY_MODAL_EVENT, handler);
  }, []);

  // Track first-mount of the whole app so Lab can show an empty state on fresh
  // load but auto-resume on intra-SPA tab switches. page.tsx stays mounted
  // across tab navigation, so this ref only re-initializes on browser reload.
  const isFirstPageMount = useRef(true);
  useEffect(() => {
    isFirstPageMount.current = false;
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-white flex">
      {/* Platform Navigation Sidebar */}
      <div className="relative w-[60px] bg-slate-900 flex flex-col items-center py-4 flex-shrink-0 z-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg flex-shrink-0">
           <span className="text-white font-bold text-lg">CT</span>
        </div>

        {/* Top nav buttons */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <button
              onClick={() => setActiveMode("lab")}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${activeMode === 'lab' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Research Design Lab"
          >
              <FlaskConical size={24} />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Research Lab
              </div>
          </button>

          <button
              onClick={() => setActiveMode("curriculum")}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${activeMode === 'curriculum' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Causality Curriculum"
          >
              <BookOpen size={24} />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Curriculum
              </div>
          </button>

          <button
              onClick={() => setActiveMode("playground")}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${activeMode === 'playground' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="DAG Playground"
          >
              <Share2 size={24} />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  DAG Playground
              </div>
          </button>

          <button
              onClick={() => setActiveMode("sandbox")}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${activeMode === 'sandbox' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Dataset Sandbox"
          >
              <Database size={24} />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Dataset Sandbox
              </div>
          </button>
        </div>

        {/* Bottom: API key settings */}
        <button
            onClick={() => setApiKeyOpen((v) => !v)}
            className={`p-3 rounded-xl transition-all duration-200 group relative ${apiKeyOpen ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="OpenAI API Key"
        >
            <KeyRound size={22} />
            {/* Dot indicator: emerald if user-key set, slate if using env default */}
            <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${storedKey ? 'bg-emerald-400' : 'bg-slate-500'}`}
            />
            {!apiKeyOpen && (
              <div className="absolute left-14 bottom-1/2 translate-y-1/2 bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  OpenAI API Key
              </div>
            )}
        </button>

        <ApiKeySettings isOpen={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
      </div>

      {/* Main Content Area + Tutor Chat panel as flex siblings */}
      <div className="flex-1 h-full overflow-hidden relative flex">
        <div className="flex-1 h-full overflow-hidden relative">
          {activeMode === "lab" ? (
              <CausalTutor
                onOpenPlayground={() => setActiveMode("playground")}
                onOpenSandbox={() => setActiveMode("sandbox")}
                skipInitialResume={isFirstPageMount.current}
              />
          ) : activeMode === "curriculum" ? (
              <CurriculumDashboard
                onContextChange={handleContextChange}
                onChatLockedChange={handleChatLockedChange}
              />
          ) : activeMode === "playground" ? (
              <DAGPlayground onContextChange={handleContextChange} />
          ) : (
              <DatasetSandbox />
          )}
        </div>

        <TutorChatPanel
          isOpen={tutorChatOpen}
          onClose={() => setTutorChatOpen(false)}
          feature={featureContext.feature}
          featureContext={featureContext.payload}
          skipInitialResume={isFirstPageMount.current}
        />
      </div>

      {/* Floating Action Button — opens the Tutor chat. Hidden when chat is open
          or when locked (e.g., during a curriculum exam). */}
      {!tutorChatOpen && !chatLocked && (
        <button
          onClick={() => setTutorChatOpen(true)}
          title="Tutor Chat"
          aria-label="Open Tutor Chat"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
        >
          <MessageSquare size={22} strokeWidth={2.25} />
        </button>
      )}
    </main>
  );
}
