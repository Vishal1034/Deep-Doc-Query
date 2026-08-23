import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Database,
  Sliders,
  Download,
  Bot,
  Layers,
  Sparkles
} from "lucide-react";

export function Sidebar({
  isOpen,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onClearAll,
  onOpenKnowledgeBase,
  onOpenSettings,
  onExportChat,
  docStats,
  activeConfig
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredChats = chats.filter((c) =>
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (chat, e) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || "Conversation");
  };

  const submitRename = (chatId, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <aside
      className={`${
        isOpen ? "w-80" : "w-0"
      } transition-all duration-300 bg-[#090d16] border-r border-slate-800/80 flex flex-col z-30 overflow-hidden min-h-0 select-none shadow-2xl`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Bot size={18} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>DEEP DOC QUERY</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                v2.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Autonomous Agentic RAG Platform
            </p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.01]"
        >
          <Plus size={16} />
          <span>New Research Session</span>
        </button>
      </div>

      {/* Search Session Filter */}
      {chats.length > 2 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search chat sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>
      )}

      {/* Chat Sessions List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        <p className="px-3 text-[10px] uppercase text-slate-500 font-bold tracking-wider my-2">
          Conversation Threads ({filteredChats.length})
        </p>

        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-slate-600 text-xs">
            No conversation history.
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = String(activeChatId) === String(chat.id);
            const isEditing = editingId === chat.id;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer ${
                  isActive
                    ? "bg-slate-800/90 text-white border border-indigo-500/30 shadow-md"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare
                    size={14}
                    className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(chat.id, e);
                        if (e.key === "Escape") cancelRename(e);
                      }}
                      className="w-full px-1.5 py-0.5 rounded bg-slate-950 text-xs text-white border border-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <span className="truncate font-medium text-slate-200 text-[12px]">
                      {chat.title || "New Conversation"}
                    </span>
                  )}
                </div>

                {/* Inline Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => submitRename(chat.id, e)}
                        className="p-1 rounded hover:bg-slate-700 text-emerald-400"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(chat, e)}
                        title="Rename"
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        title="Delete"
                        className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0c1017] shrink-0 space-y-1.5">
        {/* Knowledge Base Trigger */}
        <button
          onClick={onOpenKnowledgeBase}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition group"
        >
          <div className="flex items-center gap-2.5">
            <Database size={15} className="text-indigo-400" />
            <span className="font-semibold">Knowledge Base</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 group-hover:bg-indigo-950/60 text-indigo-300 text-[10px] font-mono border border-slate-700">
            {docStats?.total_documents ?? 0} Docs ({docStats?.total_chunks ?? 0} Chunks)
          </span>
        </button>

        {/* Model Settings Trigger */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition group"
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={15} className="text-emerald-400" />
            <span className="font-semibold">Model Engine</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 group-hover:bg-emerald-950/60 text-emerald-300 text-[10px] font-mono border border-slate-700 truncate max-w-[110px]">
            {activeConfig.provider.toUpperCase()} : {activeConfig.modelName}
          </span>
        </button>

        {/* Export and Clear Row */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={onExportChat}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition border border-slate-800/60"
            title="Download Chat as Markdown"
          >
            <Download size={13} />
            <span>Export Chat</span>
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 hover:bg-rose-950/40 text-[11px] text-slate-400 hover:text-rose-400 transition border border-slate-800/60"
            title="Clear all chat history"
          >
            <Trash2 size={13} />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
