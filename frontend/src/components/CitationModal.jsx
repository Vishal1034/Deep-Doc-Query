import React, { useState } from "react";
import { BookOpen, X, ExternalLink, ShieldCheck, Sparkles, FileText } from "lucide-react";

export function CitationPills({ sources, onSelectCitation }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-2">
        <ShieldCheck size={14} className="text-emerald-400" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
          Grounded Sources & Citations
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((src, idx) => {
          const score = src.similarity_score || 85;
          const scoreColor =
            score >= 80
              ? "text-emerald-300 bg-emerald-950/40 border-emerald-500/30"
              : score >= 60
              ? "text-indigo-300 bg-indigo-950/40 border-indigo-500/30"
              : "text-amber-300 bg-amber-950/40 border-amber-500/30";

          return (
            <button
              key={idx}
              onClick={() => onSelectCitation(src)}
              className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer ${scoreColor}`}
            >
              <FileText size={13} className="shrink-0 group-hover:text-white" />
              <span className="truncate max-w-[150px] sm:max-w-[200px] text-slate-200">
                {src.source}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 font-mono">
                {score}% Match
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CitationDetailModal({ citation, onClose }) {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm sm:text-base truncate max-w-[340px]">
                {citation.source}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Page / Section: <strong className="text-slate-300">{citation.section || `Page ${citation.page}`}</strong></span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{citation.similarity_score}% Confidence</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Preview */}
        <div className="mt-4">
          <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
            Extracted Knowledge Snippet
          </label>
          <div className="mt-2 p-4 rounded-xl bg-[#090d16] border border-slate-800 text-slate-200 text-xs sm:text-sm font-mono leading-relaxed max-h-72 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
            {citation.preview || citation.text || "No snippet text available."}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-800/80 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
}
