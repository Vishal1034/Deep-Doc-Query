import React, { useState, useEffect } from "react";
import { X, Cpu, Key, Server, Sliders, Zap, CheckCircle2, ShieldCheck } from "lucide-react";

export function ModelSettingsModal({ isOpen, onClose, config, onSaveConfig }) {
  const [provider, setProvider] = useState(config.provider || "ollama");
  const [modelName, setModelName] = useState(config.modelName || "llama3");
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [ollamaHost, setOllamaHost] = useState(config.ollamaHost || "http://localhost:11434");
  const [topK, setTopK] = useState(config.topK || 4);
  const [temperature, setTemperature] = useState(config.temperature || 0.1);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProvider(config.provider || "ollama");
      setModelName(config.modelName || "llama3");
      setApiKey(config.apiKey || "");
      setOllamaHost(config.ollamaHost || "http://localhost:11434");
      setTopK(config.topK || 4);
      setTemperature(config.temperature || 0.1);
    }
  }, [isOpen, config]);

  const handleProviderSelect = (newProv) => {
    setProvider(newProv);
    if (newProv === "ollama") setModelName("llama3");
    else if (newProv === "groq") setModelName("llama-3.3-70b-versatile");
    else if (newProv === "gemini") setModelName("gemini-1.5-flash");
    else if (newProv === "openai") setModelName("gpt-4o-mini");
  };

  const handleSave = () => {
    onSaveConfig({
      provider,
      modelName,
      apiKey,
      ollamaHost,
      topK,
      temperature
    });
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c1017] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Model & Engine Settings</h3>
              <p className="text-xs text-slate-400">
                Configure Local Ollama or Cloud LLM execution parameters.
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

        {/* Form Body */}
        <div className="mt-5 space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              LLM Inference Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProviderSelect("ollama")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  provider === "ollama"
                    ? "bg-indigo-600/20 border-indigo-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Server size={18} className="text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">Local Ollama</div>
                  <div className="text-[10px] text-slate-400">100% Offline & Private</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect("groq")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  provider === "groq"
                    ? "bg-emerald-600/20 border-emerald-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">Groq Cloud</div>
                  <div className="text-[10px] text-slate-400">Ultra-Fast Llama 3 70B</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect("gemini")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  provider === "gemini"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu size={18} className="text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">Google Gemini</div>
                  <div className="text-[10px] text-slate-400">Gemini 1.5 Flash/Pro</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect("openai")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  provider === "openai"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck size={18} className="text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">OpenAI</div>
                  <div className="text-[10px] text-slate-400">GPT-4o Mini / GPT-4o</div>
                </div>
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Active Model Identifier
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={provider === "ollama" ? "llama3" : "llama-3.3-70b-versatile"}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* API Key (if cloud) */}
          {provider !== "ollama" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>{provider.toUpperCase()} API Key</span>
                <span className="text-[10px] text-slate-500">Stored locally in your browser</span>
              </label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider} API key...`}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Ollama Host (if local) */}
          {provider === "ollama" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ollama Endpoint URL
              </label>
              <input
                type="text"
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Top-K Chunks Slider */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-300">Top-K Retrieval Depth</span>
              <span className="font-mono text-indigo-400 font-bold">{topK} Chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          {savedMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={15} />
              <span>Settings Saved!</span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
