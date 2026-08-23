import React, { useState } from "react";
import { ChevronDown, ChevronUp, BrainCircuit, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export function AgentReasoningCard({ thoughts, isGenerating }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thoughts || thoughts.length === 0) {
    if (isGenerating) {
      return (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3.5 flex items-center gap-3 animate-pulse">
          <BrainCircuit size={18} className="text-indigo-400 animate-spin" />
          <span className="text-xs font-medium text-indigo-200">
            Agent is analyzing query intent and planning retrieval vectors...
          </span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/30 bg-slate-900/60 overflow-hidden shadow-lg transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-950/40 via-slate-900/50 to-slate-900/40 hover:bg-indigo-900/30 transition text-xs font-medium text-indigo-300 border-b border-indigo-500/20"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={15} className="text-indigo-400" />
          <span className="font-semibold tracking-wide uppercase text-[11px] text-indigo-200">
            Autonomous Agent Reasoning
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
            {thoughts.length} Steps
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200">
          <span className="text-[11px]">{isOpen ? "Collapse" : "Expand thoughts"}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-2.5 bg-slate-950/40">
          {thoughts.map((th, idx) => {
            const isWarn = th.status === "warning";
            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs rounded-lg p-2 bg-slate-900/60 border border-slate-800/80"
              >
                {isWarn ? (
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{th.step}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5 text-[11.5px] leading-relaxed font-mono">
                    {th.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
