"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, Loader2, Bot, User, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getApiHeaders } from "@/lib/apiKey";
import { checkAuthResponse } from "@/lib/apiErrors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DAGChatPanelProps {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export default function DAGChatPanel({ nodes, edges, isOpen, onClose }: DAGChatPanelProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/dag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getApiHeaders() },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory.map((m) => ({ role: m.role, content: m.content })),
          graph: { nodes, edges },
        }),
      });

      await checkAuthResponse(response);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setChatHistory([...newHistory, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value);
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantMessage };
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
      const isAuth = error instanceof Error && (error as { status?: number }).status === 401;
      const content = isAuth
        ? (error as Error).message
        : "Sorry, I encountered an error. Please try again.";
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content },
      ]);
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

  if (!isOpen) return null;

  return (
    <div className="w-[350px] flex-shrink-0 border-l border-slate-200 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-800">DAG Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatHistory.length === 0 && (
          <div className="text-center py-12">
            <Bot size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Ask questions about your DAG</p>
            <p className="text-xs text-slate-400 mt-1">
              e.g. "Is X d-separated from Y?" or "What confounders exist?"
            </p>
          </div>
        )}
        {chatHistory.map((msg, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="w-7 h-7 flex-shrink-0 mt-0.5">
              {msg.role === "assistant" ? (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Bot size={14} />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                  <User size={14} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-slate-500 mb-1">
                {msg.role === "assistant" ? "Tutor" : "You"}
              </div>
              <div className="prose prose-slate prose-sm max-w-none text-[13px] text-slate-700 break-words">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
              <Bot size={14} />
            </div>
            <div className="flex items-center space-x-1.5 h-7 bg-slate-50 px-3 rounded-full border border-slate-100">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="relative flex items-end w-full p-1.5 bg-white border border-slate-200 rounded-xl focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your DAG..."
            className="flex-1 max-h-[100px] min-h-[36px] py-2 px-2 bg-transparent border-0 focus:ring-0 resize-none text-[13px] outline-none placeholder:text-slate-400 leading-relaxed"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className={`p-2 rounded-lg mb-0.5 transition-all flex-shrink-0 ${
              input.trim() && !loading
                ? "bg-slate-900 text-white hover:bg-black shadow-sm"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}
