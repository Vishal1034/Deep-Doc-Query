import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Square,
  Bot,
  User,
  Menu,
  Database,
  Sliders,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Paperclip,
  UploadCloud,
  FileCode,
  Zap,
  HelpCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Sidebar } from "./components/Sidebar";
import { CodeBlock } from "./components/CodeBlock";
import { AgentReasoningCard } from "./components/AgentReasoningCard";
import { CitationPills, CitationDetailModal } from "./components/CitationModal";
import { KnowledgeBaseModal } from "./components/KnowledgeBaseModal";
import { ModelSettingsModal } from "./components/ModelSettingsModal";

const isLocalhost =
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (isLocalhost ? "http://localhost:8000" : "/api")
).replace(/\/$/, "");

const DEFAULT_CONFIG = {
  provider: "ollama",
  modelName: "llama3",
  apiKey: "",
  ollamaHost: "http://localhost:11434",
  topK: 4,
  temperature: 0.1
};

export default function App() {
  // Config & Modals
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("rag_config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isKnowledgeOpen, setKnowledgeOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [docStats, setDocStats] = useState(null);

  // Chat sessions state
  const [allChats, setAllChats] = useState(() => {
    const saved = localStorage.getItem("rag_chats");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    const initialId = Date.now();
    return { [initialId]: [] };
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    const keys = Object.keys(allChats);
    return keys.length ? Number(keys[0]) || keys[0] : Date.now();
  });

  const [input, setInput] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);

  const messages = allChats[activeChatId] || [];

  // Persist chats & config
  useEffect(() => {
    localStorage.setItem("rag_chats", JSON.stringify(allChats));
  }, [allChats]);

  useEffect(() => {
    localStorage.setItem("rag_config", JSON.stringify(config));
  }, [config]);

  // Fetch document stats on mount
  const fetchDocStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      if (res.ok) {
        const data = await res.json();
        setDocStats(data);
      }
    } catch (err) {
      console.warn("Backend not yet ready for stats:", err);
    }
  };

  useEffect(() => {
    fetchDocStats();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Session list mapping
  const chatList = Object.keys(allChats).map((id) => {
    const chatMsgs = allChats[id] || [];
    const firstUserMsg = chatMsgs.find((m) => m.role === "user");
    return {
      id,
      title: firstUserMsg?.text ? firstUserMsg.text.substring(0, 26) : "New Conversation"
    };
  });

  const handleNewChat = () => {
    const newChatId = Date.now();
    setAllChats((prev) => ({
      ...prev,
      [newChatId]: []
    }));
    setActiveChatId(newChatId);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteChat = (id) => {
    setAllChats((prev) => {
      const copy = { ...prev };
      delete copy[id];
      const remainingKeys = Object.keys(copy);
      if (remainingKeys.length === 0) {
        const freshId = Date.now();
        copy[freshId] = [];
        setActiveChatId(freshId);
      } else if (String(activeChatId) === String(id)) {
        setActiveChatId(remainingKeys[0]);
      }
      return copy;
    });
  };

  const handleRenameChat = (chatId, newTitle) => {
    setAllChats((prev) => {
      const msgs = prev[chatId] || [];
      if (msgs.length === 0) {
        return { ...prev, [chatId]: [{ role: "user", text: newTitle, id: Date.now() }] };
      }
      const updatedMsgs = msgs.map((m, idx) =>
        idx === 0 && m.role === "user" ? { ...m, text: newTitle } : m
      );
      return { ...prev, [chatId]: updatedMsgs };
    });
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all conversation threads?")) return;
    const freshId = Date.now();
    setAllChats({ [freshId]: [] });
    setActiveChatId(freshId);
    try {
      await fetch(`${API_BASE_URL}/chat/clear`, { method: "POST" });
    } catch (e) {}
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      alert("Current conversation is empty.");
      return;
    }
    let md = `# Deep Doc Query - Agentic RAG Session Export\n\n`;
    md += `*Exported on: ${new Date().toLocaleString()}*\n*Model Engine: ${config.provider.toUpperCase()} (${config.modelName})*\n\n---\n\n`;

    messages.forEach((msg, idx) => {
      if (msg.role === "user") {
        md += `### 👤 User Query\n\n${msg.text}\n\n`;
      } else {
        md += `### 🤖 Agentic Assistant Answer\n\n${msg.text}\n\n`;
        if (msg.sources && msg.sources.length > 0) {
          md += `**Grounded Sources Used:**\n`;
          msg.sources.forEach((s) => {
            md += `- **${s.source}** (Section: ${s.section || `Page ${s.page}`}, Match: ${s.similarity_score}%)\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      }
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deep-doc-query-session-${activeChatId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Streaming Agentic RAG Execution
  const handleSendMessage = async (customQuery = null) => {
    const queryText = (customQuery || input).trim();
    if (!queryText || isGenerating) return;

    const userMsgId = Date.now();
    const botMsgId = userMsgId + 1;

    const userMsg = { id: userMsgId, role: "user", text: queryText, timestamp: Date.now() };
    const botMsg = {
      id: botMsgId,
      role: "bot",
      text: "",
      thoughts: [],
      sources: [],
      isStreaming: true,
      timestamp: Date.now()
    };

    const currentChatId = String(activeChatId);
    const currentMsgs = allChats[currentChatId] || [];
    const updatedMessages = [...currentMsgs, userMsg, botMsg];

    setAllChats((prev) => ({
      ...prev,
      [currentChatId]: updatedMessages
    }));

    setInput("");
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: queryText,
          provider: config.provider,
          model_name: config.modelName,
          api_key: config.apiKey || undefined,
          ollama_host: config.ollamaHost || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to stream from backend.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let accumulatedThoughts = [];
      let finalSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const event = JSON.parse(dataStr);

              if (event.type === "thought") {
                accumulatedThoughts = [
                  ...accumulatedThoughts,
                  { step: event.step, detail: event.detail, status: event.status }
                ];
                setAllChats((prev) => {
                  const chatList = prev[currentChatId] || [];
                  return {
                    ...prev,
                    [currentChatId]: chatList.map((m) =>
                      m.id === botMsgId ? { ...m, thoughts: accumulatedThoughts } : m
                    )
                  };
                });
              } else if (event.type === "token") {
                accumulatedText += event.token;
                setAllChats((prev) => {
                  const chatList = prev[currentChatId] || [];
                  return {
                    ...prev,
                    [currentChatId]: chatList.map((m) =>
                      m.id === botMsgId ? { ...m, text: accumulatedText } : m
                    )
                  };
                });
              } else if (event.type === "citations") {
                finalSources = event.sources || [];
                setAllChats((prev) => {
                  const chatList = prev[currentChatId] || [];
                  return {
                    ...prev,
                    [currentChatId]: chatList.map((m) =>
                      m.id === botMsgId ? { ...m, sources: finalSources } : m
                    )
                  };
                });
              } else if (event.type === "error") {
                accumulatedText += `\n\n> ⚠️ *Error: ${event.message}*`;
              }
            } catch (e) {
              // Ignore non-json chunks
            }
          }
        }
      }

      // Mark streaming done
      setAllChats((prev) => {
        const chatList = prev[currentChatId] || [];
        return {
          ...prev,
          [currentChatId]: chatList.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text: accumulatedText,
                  thoughts: accumulatedThoughts,
                  sources: finalSources,
                  isStreaming: false
                }
              : m
          )
        };
      });
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Stream aborted by user.");
      } else {
        console.error("Stream error:", err);
        setAllChats((prev) => {
          const chatList = prev[currentChatId] || [];
          return {
            ...prev,
            [currentChatId]: chatList.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    text:
                      m.text ||
                      "⚠️ Failed to connect to Agentic RAG backend. Verify that the server is active on " +
                        API_BASE_URL,
                    isStreaming: false
                  }
                : m
            )
          };
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = (userText) => {
    handleSendMessage(userText);
  };

  const quickPills = [
    "Summarize system architecture",
    "What are the main functions & endpoints?",
    "Extract prerequisites & setup steps",
    "Find potential performance bottlenecks"
  ];

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        chats={chatList}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onClearAll={handleClearAllHistory}
        onOpenKnowledgeBase={() => setKnowledgeOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onExportChat={handleExportChat}
        docStats={docStats}
        activeConfig={config}
      />

      {/* Main Chat Viewport */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-gradient-to-b from-[#090d16] via-[#07090e] to-[#05070a]">
        {/* Top Navbar */}
        <nav className="p-3.5 px-4 sm:px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16]/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Toggle Sidebar"
            >
              <Menu size={19} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  DEEP DOC QUERY
                </span>
                <span className="hidden sm:inline-block text-slate-600">•</span>
                <span className="text-[11px] text-indigo-300 font-medium bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  Agentic Reasoning Mode
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKnowledgeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700/60 shadow-sm"
            >
              <Database size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Knowledge Base</span>
              {docStats && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] font-mono">
                  {docStats.total_documents}
                </span>
              )}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700/60 shadow-sm"
              title="Model Settings"
            >
              <Sliders size={14} className="text-emerald-400" />
              <span className="hidden md:inline font-mono uppercase text-[11px]">
                {config.provider}
              </span>
            </button>
          </div>
        </nav>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:px-20 lg:px-36 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 animate-in fade-in">
              <div className="relative mb-6">
                <div className="p-4 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-2xl shadow-indigo-500/25 border border-indigo-400/20">
                  <Bot size={44} />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white border-2 border-[#07090e]">
                  <Sparkles size={14} />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Deep Doc Query Engine
              </h2>
              <p className="text-sm text-slate-400 mt-2.5 max-w-lg leading-relaxed">
                Autonomous Agentic RAG with multi-vector decomposition, self-correcting retrieval (CRAG), and verified citations across your PDFs, DOCX, Code, and Markdown files.
              </p>

              {/* Quick Prompt Pills */}
              <div className="mt-8 w-full">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-3">
                  Suggested Research Queries
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickPills.map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(pill)}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 text-left text-xs font-medium text-slate-300 hover:text-white transition shadow-sm hover:border-indigo-500/40 hover:scale-[1.01]"
                    >
                      💡 {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Knowledge Base CTA if empty */}
              {(!docStats || docStats.total_documents === 0) && (
                <div className="mt-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full">
                  <div className="text-left">
                    <span className="font-semibold text-indigo-300">Your Knowledge Base is empty!</span>
                    <p className="text-slate-400 text-[11px]">
                      Upload documentation, code files, or PDFs to unlock deep reasoning.
                    </p>
                  </div>
                  <button
                    onClick={() => setKnowledgeOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shrink-0 transition"
                  >
                    Upload Documents
                  </button>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id || i}
                  className={`flex gap-3.5 ${
                    isUser ? "justify-end" : "justify-start animate-in fade-in"
                  }`}
                >
                  {!isUser && (
                    <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 h-9 w-9 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Bot size={18} />
                    </div>
                  )}

                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 transition-all ${
                      isUser
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/10 rounded-tr-sm"
                        : "bg-[#0d131f] border border-slate-800/80 shadow-2xl text-slate-200 rounded-tl-sm"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5">
                        {isUser ? <User size={12} /> : <Sparkles size={12} className="text-indigo-400" />}
                        <span>{isUser ? "You" : "Deep Doc Agent"}</span>
                      </span>

                      {!isUser && msg.text && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Agent Thought Card */}
                    {!isUser && (
                      <AgentReasoningCard
                        thoughts={msg.thoughts}
                        isGenerating={msg.isStreaming}
                      />
                    )}

                    {/* Content Markdown */}
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed break-words">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-base font-bold text-white mb-2 mt-3" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-indigo-300 mb-2 mt-3" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-slate-200 mb-1 mt-2 uppercase tracking-wide" {...props} />,
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-2 border-indigo-500/50 pl-3 italic text-slate-400 my-2" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeString = String(children).replace(/\n$/, "");
                            if (!inline && match) {
                              return <CodeBlock language={match[1]} value={codeString} />;
                            }
                            return (
                              <code
                                className="bg-slate-900 px-1.5 py-0.5 rounded text-[12px] font-mono text-indigo-300 border border-slate-800"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {msg.isStreaming && !msg.text && (
                        <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse" />
                      )}
                    </div>

                    {/* Citations Footer */}
                    {!isUser && msg.sources && (
                      <CitationPills
                        sources={msg.sources}
                        onSelectCitation={(cit) => setSelectedCitation(cit)}
                      />
                    )}
                  </div>

                  {isUser && (
                    <div className="p-2 rounded-xl bg-indigo-600 text-white h-9 w-9 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-indigo-600/20">
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Search & Prompt Bar */}
        <div className="p-4 sm:p-6 md:px-20 lg:px-36 bg-gradient-to-t from-[#07090e] via-[#07090e]/95 to-transparent relative z-10">
          <div className="max-w-4xl mx-auto relative">
            <div className="relative flex items-center rounded-2xl bg-[#0c1017] border border-slate-700/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-2xl">
              {/* Document shortcut button */}
              <button
                type="button"
                onClick={() => setKnowledgeOpen(true)}
                className="p-3.5 text-slate-400 hover:text-indigo-300 transition"
                title="Knowledge Base"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask deep questions across your documentation & codebases..."
                className="flex-1 bg-transparent py-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none resize-none custom-scrollbar max-h-32"
              />

              {/* Submit or Stop Button */}
              <div className="pr-3 flex items-center gap-1.5">
                {isGenerating ? (
                  <button
                    onClick={handleStopGenerating}
                    className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition shadow-lg flex items-center gap-1 text-xs"
                    title="Stop Generating"
                  >
                    <Square size={16} fill="white" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim()}
                    className={`p-2.5 rounded-xl transition shadow-lg text-white ${
                      input.trim()
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30 cursor-pointer"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Send size={17} />
                  </button>
                )}
              </div>
            </div>

            {/* Subtitle Status */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-2">
              <span className="flex items-center gap-1">
                <Zap size={12} className="text-indigo-400" />
                <span>Engine: <strong className="text-slate-400 uppercase">{config.provider}</strong> ({config.modelName})</span>
              </span>
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px]">Shift + Enter</kbd> for newline</span>
            </div>
          </div>
        </div>
      </main>

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        apiBaseUrl={API_BASE_URL}
        onDocsChanged={fetchDocStats}
      />

      {/* Model Settings Modal */}
      <ModelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={(newCfg) => setConfig(newCfg)}
      />

      {/* Citation Detail Modal */}
      <CitationDetailModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
