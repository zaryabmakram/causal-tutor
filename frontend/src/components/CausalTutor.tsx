"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { APIAnalysisResponse } from "@/types";
import { 
  Loader2, Paperclip, Bot, User, 
  Plus, PanelRightClose, PanelRightOpen,
  LayoutDashboard, X, FileText, ArrowUp,
  BrainCircuit, BookOpen, GraduationCap,
  MessageSquare, Trash2, Maximize2, AlertTriangle, GitBranch
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import dynamic from "next/dynamic";

const MermaidChart = dynamic(() => import("./MermaidChart"), { ssr: false });

// Types for History
interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    messages: Array<{ role: string; content: string }>;
    analysis: APIAnalysisResponse | null;
}

export default function CausalTutor() {
  // State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  
  // Chat & Analysis State
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [analysis, setAnalysis] = useState<APIAnalysisResponse | null>(null);
  
  // Session Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('causal_tutor_sessions');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('causal_tutor_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createNewSession = () => {
    // If current session is empty, don't create a new one, just reset
    if (chatHistory.length === 0 && !analysis) return;

    // Save current session before clearing if it has content
    if (currentSessionId) {
        updateSession(currentSessionId, { messages: chatHistory, analysis });
    }

    // Reset state for new session
    setChatHistory([]);
    setAnalysis(null);
    setFile(null);
    setIsContextPanelOpen(false);
    setCurrentSessionId(null);
  };

  const loadSession = (session: ChatSession) => {
    // Save current if needed
    if (currentSessionId && currentSessionId !== session.id) {
         updateSession(currentSessionId, { messages: chatHistory, analysis });
    }

    setCurrentSessionId(session.id);
    setChatHistory(session.messages);
    setAnalysis(session.analysis);
    setIsContextPanelOpen(!!session.analysis); // Open context if analysis exists
    
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) {
          createNewSession();
      }
  };

  const updateSession = (id: string, data: Partial<ChatSession>) => {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const handleSubmit = async () => {
    if ((!input && !file) || loading) return;

    setLoading(true);
    
    // Check if this is the start of a new session
    let sessionId = currentSessionId;
    if (!sessionId) {
        sessionId = Date.now().toString();
        const newSession: ChatSession = {
            id: sessionId,
            title: file ? file.name : (input.slice(0, 30) || "New Analysis"),
            timestamp: Date.now(),
            messages: [],
            analysis: null
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(sessionId);
    }

    // Determine if we need to run analysis (Upload or Scenario)
    // Rule: Run analysis if we have a file OR if we have no analysis yet and the input looks like a scenario
    const shouldRunAnalysis = !analysis && (file || input.length > 10); 
    
    try {
      if (shouldRunAnalysis) {
        // --- ANALYSIS FLOW ---
        const userDisplayMsg = file ? `Analyzing file: **${file.name}**` : input;
        
        // Optimistic UI update
        const newHistory = [...chatHistory, { role: "user", content: userDisplayMsg }];
        setChatHistory(newHistory);
        setInput("");

        let response;
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            response = await axios.post<APIAnalysisResponse>("http://localhost:8000/analyze", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
        } else {
            response = await axios.post<APIAnalysisResponse>("http://localhost:8000/analyze-scenario", {
                text: input,
                scenario_name: "User Scenario"
            });
        }

        const analysisData = response.data;
        setAnalysis(analysisData);
        setIsContextPanelOpen(true);
        
        const assistantMsg = { 
            role: "assistant", 
            content: `I've analyzed the ${file ? 'paper' : 'scenario'}. \n\n### Core Causal Query\n> *${analysisData.analysis.causal_query}*\n\nI've evaluated the methodology, identified key assumptions, and generated a **Causal Graph (DAG)**. \n\nCheck the **Context Panel** on the right for a critique of the study design and alternative methods considered.` 
        };
        
        const updatedHistory = [...newHistory, assistantMsg];
        setChatHistory(updatedHistory);
        
        // Update Session
        updateSession(sessionId, { 
            title: analysisData.analysis.paper_name || (file ? file.name : "Scenario Analysis"),
            messages: updatedHistory, 
            analysis: analysisData 
        });

        setFile(null);

      } else {
        // --- CHAT FLOW ---
        if (!analysis) {
             alert("Please upload a paper or describe a scenario first.");
             setLoading(false);
             return;
        }

        const userMsg = input;
        const newHistory = [...chatHistory, { role: "user", content: userMsg }];
        setChatHistory(newHistory);
        setInput("");

        // Construct Context
        const analysisContext = `
          Paper: ${analysis.analysis.paper_name}
          Query: ${analysis.analysis.causal_query}
          Methods: ${analysis.analysis.methods.map(m => m.method_name).join(", ")}
          Critiques: ${analysis.analysis.methods.map(m => m.critique).join("; ")}
          Causal Graph: ${analysis.analysis.causal_graph_mermaid}
        `;

        const response = await fetch("http://localhost:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMsg,
              history: chatHistory,
              paper_text: analysis.full_text,
              analysis_context: analysisContext
            }),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        // Add placeholder for streaming
        setChatHistory([...newHistory, { role: "assistant", content: "" }]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            assistantMessage += chunk;
            
            setChatHistory(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantMessage };
              return updated;
            });
        }

        // Final update to session
        updateSession(sessionId, { 
            messages: [...newHistory, { role: "assistant", content: assistantMessage }] 
        });
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR (Navigation) */}
      <div 
        className={`${isSidebarOpen ? 'w-[260px] translate-x-0' : 'w-0 -translate-x-full'} bg-slate-50 border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col overflow-hidden relative h-full z-30`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
            <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors md:hidden absolute right-2 top-2"
            >
                <PanelRightClose size={18} />
            </button>
            <div className="flex items-center gap-2 px-2 w-full">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                    <BrainCircuit className="text-white w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-800 tracking-tight">Causal Tutor</span>
            </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 mb-4">
            <button 
                onClick={createNewSession}
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-all text-sm font-medium text-slate-700 shadow-sm group"
            >
                <Plus size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                New Analysis
            </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
            <div className="text-[10px] font-bold text-slate-400 px-3 mb-2 uppercase tracking-wider">History</div>
            {sessions.length > 0 ? (
                sessions.map(session => (
                    <div 
                        key={session.id}
                        className={`group flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm truncate transition-colors cursor-pointer border ${currentSessionId === session.id ? 'bg-white border-slate-200 shadow-sm' : 'border-transparent hover:bg-slate-200/50'}`}
                        onClick={() => loadSession(session)}
                    >
                        <MessageSquare size={14} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className={`truncate font-medium flex-1 ${currentSessionId === session.id ? 'text-slate-800' : 'text-slate-600'}`}>
                            {session.title}
                        </span>
                        <button 
                            onClick={(e) => deleteSession(e, session.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 rounded text-slate-400 hover:text-red-500 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))
            ) : (
                <div className="px-3 py-8 text-center">
                    <p className="text-xs text-slate-400 italic">No history yet</p>
                </div>
            )}
        </div>
      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        
        {/* Header */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-transparent transition-all">
            <div className="flex items-center gap-2">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="Open Sidebar">
                        <PanelRightOpen size={20} />
                    </button>
                )}
                <span className="font-semibold text-slate-700 md:hidden flex items-center gap-2">
                    <BrainCircuit size={18} /> Causal Tutor
                </span>
            </div>
            <div className="flex items-center gap-2">
                {analysis && (
                    <button 
                        onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium border ${isContextPanelOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-sm'}`}
                    >
                        <LayoutDashboard size={16} />
                        <span className="hidden md:inline">Context Panel</span>
                    </button>
                )}
            </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth flex flex-col w-full">
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-0 pt-6 pb-4">
                
                {chatHistory.length === 0 ? (
                    // EMPTY STATE
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500 mt-8 px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-white">
                            <BrainCircuit size={40} className="text-indigo-600" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-3 text-center tracking-tight">
                            Start Causal Analysis
                        </h2>
                        <p className="text-slate-500 mb-10 text-center max-w-md text-base leading-relaxed">
                            Upload a research paper or describe a study design. I'll critique the methodology, check assumptions, and suggest alternatives.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                            <SuggestionCard 
                                icon={<GraduationCap size={20} className="text-indigo-500" />}
                                title="Analyze a Paper"
                                subtitle="Upload PDF for critique"
                                onClick={() => fileInputRef.current?.click()}
                            />
                            <SuggestionCard 
                                icon={<BookOpen size={20} className="text-emerald-500" />}
                                title="Design a Study"
                                subtitle="Get help choosing a method"
                                onClick={() => setInput("I want to estimate the causal effect of...")}
                            />
                        </div>
                    </div>
                ) : (
                    // CHAT MESSAGES
                    <div className="space-y-10 pb-4 w-full">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className="flex gap-4 md:gap-6 group w-full px-4 md:px-0">
                                <div className="w-8 h-8 flex-shrink-0 mt-1">
                                    {msg.role === 'assistant' ? (
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-white">
                                            <Bot size={18} strokeWidth={2.5} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 ring-2 ring-white border border-slate-200">
                                            <User size={18} strokeWidth={2.5} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="font-semibold text-sm text-slate-900 mb-1">
                                        {msg.role === 'assistant' ? 'Causal Tutor' : 'You'}
                                    </div>
                                    <div className="prose prose-slate prose-p:leading-7 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 max-w-none text-[15px] text-slate-800 break-words font-normal">
                                        <ReactMarkdown 
                                            components={{
                                                code: ({node, ...props}) => <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2" {...props} />,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-slate-600 my-2" {...props} />
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-4 md:gap-6 px-4 md:px-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                                    <Bot size={18} strokeWidth={2.5} />
                                </div>
                                <div className="flex items-center space-x-1.5 h-8 bg-slate-50 px-4 rounded-full border border-slate-100">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>
        </div>

        {/* 3. INPUT AREA (Fixed Bottom) */}
        <div className="flex-shrink-0 px-4 pb-6 pt-2 bg-white w-full">
            <div className="max-w-3xl mx-auto w-full relative">
                {file && (
                    <div className="absolute -top-12 left-0 animate-in slide-in-from-bottom-2 z-10">
                        <div className="bg-white border border-slate-200 rounded-lg pl-2 pr-3 py-1.5 shadow-sm flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center border border-red-100">
                                <span className="text-red-500 text-[10px] font-bold">PDF</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{file.name}</span>
                                <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <button onClick={clearFile} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 ml-1 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="relative flex items-end w-full p-2 bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/40 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".pdf"
                        onChange={handleFileSelect}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all mb-0.5 flex-shrink-0 group"
                        title="Attach Paper"
                    >
                        <Paperclip size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                    
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={file ? "Ask about this paper..." : "Ask anything about causal inference..."}
                        className="flex-1 max-h-[200px] min-h-[44px] py-3 px-3 bg-transparent border-0 focus:ring-0 resize-none text-[15px] outline-none placeholder:text-slate-400 leading-relaxed scrollbar-hide"
                        rows={1}
                        style={{ height: 'auto', minHeight: '44px' }}
                    />
                    
                    <button 
                        onClick={handleSubmit}
                        disabled={(!input && !file) || loading}
                        className={`p-2.5 rounded-xl mb-0.5 transition-all duration-300 flex-shrink-0 ${
                            (input || file) && !loading 
                                ? 'bg-slate-900 text-white hover:bg-black shadow-md hover:shadow-lg transform active:scale-95' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
                    </button>
                </div>
                <div className="text-center mt-3 text-[11px] text-slate-400 font-medium">
                    AI can make mistakes. Check important info.
                </div>
            </div>
        </div>
      </div>

      {/* 4. CONTEXT PANEL (Right Sidebar) */}
      <div className={`${isContextPanelOpen && analysis ? 'w-[400px] translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0'} bg-slate-50 border-l border-slate-200 flex-shrink-0 flex flex-col h-full shadow-2xl z-40 transition-all duration-300 ease-in-out fixed right-0 md:relative overflow-hidden`}>
          <div className="flex flex-col h-full min-w-[400px]"> {/* Fixed width container */}
             <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                 <div className="flex items-center gap-2 text-slate-800">
                    <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                        <LayoutDashboard size={16} />
                    </div>
                    <h3 className="font-bold text-sm">Context & Methods</h3>
                 </div>
                 <button onClick={() => setIsContextPanelOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                     <X size={18} />
                 </button>
             </div>
             
             {analysis && (
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8 bg-slate-50/50">
                     {/* DAG Card */}
                     {analysis.analysis.causal_graph_mermaid && (
                         <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Causal Graph (DAG)</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsGraphModalOpen(true)}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Maximize Graph"
                                    >
                                        <Maximize2 size={14} />
                                    </button>
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-medium border border-slate-200">Mermaid.js</span>
                                </div>
                             </div>
                             <div className="bg-white rounded-xl p-3 flex justify-center overflow-hidden border border-slate-100 shadow-inner max-h-[250px] cursor-pointer" onClick={() => setIsGraphModalOpen(true)}>
                                <MermaidChart chart={analysis.analysis.causal_graph_mermaid} />
                             </div>
                         </div>
                     )}

                     {/* Methods List with Critique */}
                     <div>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis & Critique</h4>
                        </div>
                        
                        <div className="space-y-6">
                            {analysis.analysis.methods.map((method, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all cursor-default group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    {/* Method Name */}
                                    <div className="flex items-center justify-between mb-3 pl-2">
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{method.method_name}</h4>
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-full border border-indigo-100">Chosen Method</span>
                                    </div>
                                    
                                    {/* Selection Rationale */}
                                    <p className="text-xs text-slate-600 leading-relaxed mb-4 pl-2 border-l border-slate-100 group-hover:border-indigo-100 transition-colors">
                                        {method.method_selection_summary.substring(0, 200)}...
                                    </p>

                                    {/* Critique Section (New) */}
                                    {method.critique && (
                                        <div className="mb-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase mb-1">
                                                <AlertTriangle size={12} /> Critique & Threats
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed">{method.critique}</p>
                                        </div>
                                    )}
                                    
                                    {/* Assumptions (New) */}
                                    {method.assumptions && method.assumptions.length > 0 && (
                                        <div className="mb-4 pl-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assumptions</div>
                                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                                                {method.assumptions.slice(0,3).map((ass, i) => (
                                                    <li key={i}>{ass}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Evidence */}
                                    {method.cited_paragraphs.length > 0 && (
                                        <div className="bg-slate-50/80 -mx-5 -mb-5 px-5 py-4 border-t border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase mb-2">
                                                <FileText size={12} className="text-indigo-500" /> Evidence
                                            </div>
                                            <div className="space-y-2">
                                                {method.cited_paragraphs.slice(0, 2).map((cite, i) => (
                                                    <div key={i} className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm">
                                                        "{cite.text.substring(0, 80)}..."
                                                        <span className="text-[9px] not-italic font-bold text-slate-400 ml-1 bg-slate-100 px-1 rounded">P.{cite.page}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                     </div>

                     {/* Alternative Methods (New) */}
                     {analysis.analysis.alternative_methods && analysis.analysis.alternative_methods.length > 0 && (
                         <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alternative Approaches</h4>
                            </div>
                            <div className="space-y-3">
                                {analysis.analysis.alternative_methods.map((alt, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-pink-200 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <GitBranch size={14} className="text-pink-500" />
                                            <h4 className="font-bold text-slate-800 text-xs">{alt.method_name}</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[11px] text-slate-600 leading-snug"><strong className="text-slate-900">Why considered:</strong> {alt.feasibility}</p>
                                            <p className="text-[11px] text-slate-600 leading-snug"><strong className="text-slate-900">Trade-off:</strong> {alt.trade_off}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                     )}

                 </div>
             )}
          </div>
      </div>

      {/* 5. FULLSCREEN GRAPH MODAL */}
      {isGraphModalOpen && analysis?.analysis.causal_graph_mermaid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-[90vw] h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                              <BrainCircuit size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800">Causal Directed Acyclic Graph (DAG)</h3>
                              <p className="text-xs text-slate-500">Visualizing causal relationships and confounders</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setIsGraphModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                              <X size={24} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 p-8 overflow-auto flex items-center justify-center">
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full h-full flex items-center justify-center">
                          <div className="w-full h-full flex items-center justify-center transform scale-125 origin-center"> {/* Scale up for visibility */}
                              <MermaidChart chart={analysis.analysis.causal_graph_mermaid} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

function SuggestionCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-start p-5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all text-left shadow-sm group w-full relative overflow-hidden"
        >
            <div className="mb-3 p-2 bg-slate-50 rounded-xl group-hover:bg-white group-hover:scale-110 transition-all duration-300 border border-slate-100 shadow-sm">{icon}</div>
            <div className="font-bold text-sm text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{title}</div>
            <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                <ChevronRight size={16} className="text-slate-300" />
            </div>
        </button>
    );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={className}
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
