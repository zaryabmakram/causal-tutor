"use client";

import { useState, useEffect } from "react";
import { BookOpen, GraduationCap, PlayCircle, Loader2, ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { getApiHeaders } from "@/lib/apiKey";
import { checkAuthResponse } from "@/lib/apiErrors";

const MermaidChart = dynamic(() => import("./MermaidChart"), { ssr: false });

export default function CurriculumDashboard() {
    const [methods, setMethods] = useState<any[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "theory" | "exam">("grid");
    const [examQuestions, setExamQuestions] = useState<any[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [loadingExam, setLoadingExam] = useState<string | null>(null);
    const [loadingTheory, setLoadingTheory] = useState(true);
    const [numQuestions, setNumQuestions] = useState<number>(5); // User can select number of questions

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const res = await fetch("http://localhost:8000/curriculum-methods");
                const data = await res.json();
                // Map object to array
                const methodsArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                    // Assign random color just for UI
                    color: ["bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-rose-100 text-rose-700"][Math.floor(Math.random() * 5)]
                }));
                setMethods(methodsArray);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingTheory(false);
            }
        };
        fetchMethods();
    }, []);

    const startTheory = (method: any) => {
        setSelectedMethod(method);
        setViewMode("theory");
    };

    const startExam = async (methodId: string, methodTitle: string) => {
        setLoadingExam(methodId);
        try {
            const res = await fetch(`http://localhost:8000/generate-exam?method_name=${methodTitle}&num_questions=${numQuestions}`, {
                method: "POST",
                headers: { ...getApiHeaders() },
            });
            await checkAuthResponse(res);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            setExamQuestions(data.questions);
            setViewMode("exam");
            setCurrentQuestionIdx(0);
            setScore(0);
            setShowResult(false);
        } catch (e) {
            console.error(e);
            const isAuth = e instanceof Error && (e as { status?: number }).status === 401;
            alert(isAuth ? (e as Error).message : "Failed to generate exam. Ensure backend is running.");
        } finally {
            setLoadingExam(null);
        }
    };

    const handleAnswer = (optionIndex: number) => {
        const correct = examQuestions[currentQuestionIdx].correct_option_index;
        if (optionIndex === correct) setScore(s => s + 1);
        
        if (currentQuestionIdx + 1 < examQuestions.length) {
            setCurrentQuestionIdx(i => i + 1);
        } else {
            setShowResult(true);
        }
    };

    if (viewMode === "exam" && examQuestions.length > 0) {
        if (showResult) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center border border-slate-200">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <GraduationCap size={40} className="text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Exam Complete!</h2>
                        <p className="text-slate-500 mb-8">You scored <span className="font-bold text-slate-900">{score} / {examQuestions.length}</span></p>
                        
                        <button 
                            onClick={() => setViewMode("grid")}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                        >
                            Return to Curriculum
                        </button>
                    </div>
                </div>
            );
        }

        const q = examQuestions[currentQuestionIdx];
        return (
            <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Exam Mode</span>
                    <span className="text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">Question {currentQuestionIdx + 1} / {examQuestions.length}</span>
                </header>
                
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-2xl w-full overflow-hidden">
                        <div className="p-8">
                            <h3 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">{q.question_text}</h3>
                            <div className="space-y-3">
                                {q.options.map((opt: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-slate-700 font-medium"
                                    >
                                        <span className="inline-block w-6 font-bold text-slate-400 mr-2">{String.fromCharCode(65 + idx)}.</span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === "theory" && selectedMethod) {
        return (
            <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setViewMode("grid")}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900">{selectedMethod.title}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-xs font-semibold text-slate-500">Length:</span>
                            <select 
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(Number(e.target.value))}
                                className="bg-transparent border-none text-slate-700 text-sm focus:ring-0 p-0 outline-none cursor-pointer"
                            >
                                <option value={3}>3 Qs</option>
                                <option value={5}>5 Qs</option>
                                <option value={10}>10 Qs</option>
                                <option value={15}>15 Qs</option>
                                <option value={20}>20 Qs</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => startExam(selectedMethod.id, selectedMethod.title)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <PlayCircle size={16} /> Take Exam
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8 pb-12">
                        {/* Overview */}
                        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <BookOpen size={20} className="text-indigo-500" />
                                Conceptual Overview
                            </h3>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                {selectedMethod.description}
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Assumptions */}
                            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                    Key Assumptions
                                </h3>
                                <ul className="space-y-4">
                                    {selectedMethod.key_assumptions.map((ass: string, idx: number) => {
                                        const [title, desc] = ass.split(":");
                                        return (
                                            <li key={idx} className="flex gap-3">
                                                <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                <div>
                                                    <span className="font-bold text-slate-800">{title}:</span>
                                                    <span className="text-slate-600">{desc}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            {/* Causal Graph */}
                            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <ChevronRight size={20} className="text-indigo-500" />
                                        Identification Strategy
                                    </span>
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-medium border border-slate-200">DAG</span>
                                </h3>
                                <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-center min-h-[200px]">
                                    <MermaidChart chart={selectedMethod.dag_mermaid} />
                                </div>
                            </section>
                        </div>

                        {/* Example */}
                        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100 shadow-inner">
                            <h3 className="text-lg font-bold text-indigo-900 mb-2">Classic Example</h3>
                            <p className="text-indigo-800 leading-relaxed italic">
                                "{selectedMethod.example_scenario}"
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            <header className="px-8 py-6 bg-white border-b border-slate-200 shadow-sm z-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="text-indigo-600" size={24} />
                        <h1 className="text-2xl font-bold text-slate-900">Causality Curriculum</h1>
                    </div>
                    <p className="text-slate-500">Master the 10 core methods of causal inference through theory and interactive exams.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-sm font-semibold text-slate-600">Exam Length:</span>
                    <select 
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none cursor-pointer"
                    >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loadingTheory ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {methods.map((method) => (
                            <div 
                                key={method.id}
                                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col h-full"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${method.color} shadow-inner`}>
                                    <BookOpen size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">{method.title}</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1">
                                    {method.description}
                                </p>
                                
                                <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
                                    <button 
                                        className="flex-1 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                                        onClick={() => startTheory(method)}
                                    >
                                        <BookOpen size={16} className="text-slate-400" />
                                        Learn Theory
                                    </button>
                                    <button 
                                        onClick={() => startExam(method.id, method.title)}
                                        disabled={loadingExam === method.id}
                                        className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {loadingExam === method.id ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                        Start Exam
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
