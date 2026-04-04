import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, BookOpen, Plus, MessageSquare, Menu, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

const isLocalhost =
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (isLocalhost ? "http://localhost:8000" : "/api")
).replace(/\/$/, "");

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const initialChatId = Date.now();
  const [activeChatId, setActiveChatId] = useState(initialChatId);
  const [allChats, setAllChats] = useState({ [initialChatId]: [] });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);

  const chatList = Object.keys(allChats).map((id) => ({
    id,
    title: allChats[id][0]?.text?.substring(0, 24) || "New Conversation",
  }));

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    const newChatId = Date.now();
    const currentChatId = String(activeChatId);

    setAllChats((prev) => ({
      ...prev,
      [currentChatId]: messages,
      [String(newChatId)]: [],
    }));
    setActiveChatId(newChatId);
    setMessages([]);
  };

  const switchChat = (id) => {
    setActiveChatId(id);
    setMessages(allChats[id] || []);
  };

  const handleClearAllHistory = async () => {
    const freshChatId = Date.now();
    setActiveChatId(freshChatId);
    setAllChats({ [freshChatId]: [] });
    setMessages([]);

    try {
      await fetch(`${API_BASE_URL}/chat/clear`, { method: "POST" });
    } catch (err) {
      console.error("Clear chat error:", err);
    }
  };

  const handleStreamResponse = async () => {
    if (!input.trim()) return;

    const chatId = String(activeChatId);
    const baseMessages = allChats[chatId] || messages;
    const userMsg = { role: "user", text: input };
    const botMsgId = Date.now();
    const botPlaceholder = { id: botMsgId, role: "bot", text: "", sources: [] };
    const nextMessages = [...baseMessages, userMsg, botPlaceholder];

    setMessages(nextMessages);
    const currentInput = input;
    setInput("");

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let finalSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                accumulatedText += data.token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId ? { ...m, text: accumulatedText } : m
                  )
                );
              }
              if (data.sources) {
                finalSources = data.sources;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId ? { ...m, sources: data.sources } : m
                  )
                );
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      const finalMessages = [...baseMessages, userMsg, { ...botPlaceholder, text: accumulatedText, sources: finalSources }];
      setMessages(finalMessages);
      setAllChats((prev) => ({
        ...prev,
        [chatId]: finalMessages,
      }));
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: "Error contacting backend. Check if FastAPI is running." }
            : m
        )
      );
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || payload.message || `Upload failed with status ${response.status}`);
      }

      alert(payload.message || "File indexed successfully!");
    } catch (err) {
      console.error("Upload failed", err);
      alert(err instanceof Error ? err.message : "Failed to index file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-72" : "w-0"
        } transition-all duration-300 bg-[#161b22] border-r border-gray-800 flex flex-col z-20 overflow-hidden min-h-0`}
      >
        {/* TOP: Fixed New Chat Button */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 border border-gray-700 p-2.5 rounded-lg hover:bg-gray-800 transition text-sm font-medium bg-[#1c2128]"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>

        {/* MIDDLE: Scrollable History */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 custom-scrollbar">
          <p className="px-3 text-[10px] uppercase text-gray-500 font-bold mb-3 mt-2">Recent Queries</p>
          <div className="space-y-1">
            {chatList.map((chat) => (
            <button
              key={chat.id}
              onClick={() => switchChat(chat.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm transition group truncate ${
                String(activeChatId) === chat.id ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate text-left">{chat.title}</span>
            </button>
            ))}
          </div>
        </div>

        {/* BOTTOM: Fixed Utility Buttons */}
        <div className="p-4 border-t border-gray-800 bg-[#161b22] shrink-0 space-y-2">
          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer text-sm text-gray-400 hover:text-white transition">
            <BookOpen size={18} />
            <span>{uploading ? "Indexing..." : "Upload Doc"}</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".md,.pdf"
            />
          </label>
          <button
            onClick={handleClearAllHistory}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-900/20 text-sm text-gray-400 hover:text-red-400 transition"
          >
            <X size={16} /> Clear All History
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Nav */}
        <nav className="p-4 flex items-center gap-4 border-b border-gray-800 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="text-blue-400" />
            <span className="font-bold tracking-tight">RAG CORE v1</span>
          </div>
        </nav>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:px-24 space-y-8">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <Bot size={64} className="mb-4" />
              <p className="text-xl">Upload your documentation and start coding.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${
                msg.role === "user" ? "justify-end" : "justify-start animate-in fade-in slide-in-from-bottom-2"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-blue-600 shadow-lg"
                    : "bg-[#1c2128] border border-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {msg.role === "user" ? (
                    <User size={14} />
                  ) : (
                    <Bot size={14} className="text-blue-400" />
                  )}
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">
                    {msg.role}
                  </span>
                </div>
                
                {/* Markdown Rendering for rich formatting */}
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                      code: ({ node, inline, ...props }) =>
                        inline ? (
                          <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        ) : (
                          <code
                            className="block bg-gray-800 p-3 rounded text-xs font-mono mb-2 overflow-x-auto"
                            {...props}
                          />
                        ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-700 flex flex-wrap gap-2">
                    {msg.sources.map((s, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-[10px] text-gray-400"
                      >
                        <BookOpen size={10} /> {s.split("/").pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Search Bar Frame */}
        <div className="p-6 md:px-24 bg-gradient-to-t from-[#0d1117] via-[#0d1117] to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <input
              className="w-full bg-[#1c2128] border border-gray-700 rounded-xl py-4 pl-4 pr-14 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-2xl placeholder:text-gray-600"
              placeholder="Query local documentation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleStreamResponse()}
            />
            <button
              onClick={handleStreamResponse}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-3">
            Local RAG System • No data leaves this machine • Llama 3 8B
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
