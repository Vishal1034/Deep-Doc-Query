import React, { useState, useEffect } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Search,
  Eye
} from "lucide-react";

export function KnowledgeBaseModal({ isOpen, onClose, apiBaseUrl, onDocsChanged }) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchDocsAndStats = async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/documents`).then((r) => r.json()),
        fetch(`${apiBaseUrl}/stats`).then((r) => r.json())
      ]);
      setDocuments(docsRes.documents || []);
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to load documents:", err);
      showNotify("Could not connect to backend to load documents.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocsAndStats();
    }
  }, [isOpen]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setUploading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      showNotify(`Indexed ${files.length} document(s) successfully!`);
      await fetchDocsAndStats();
      if (onDocsChanged) onDocsChanged();
    } catch (err) {
      showNotify(err.message || "Failed to upload documents.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete '${filename}' and all its vector embeddings?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");
      showNotify(`Deleted '${filename}' from vector database.`);
      await fetchDocsAndStats();
      if (onDocsChanged) onDocsChanged();
    } catch (err) {
      showNotify(err.message || "Could not delete document.", "error");
    }
  };

  const handleInspectChunks = async (filename) => {
    setLoadingChunks(true);
    try {
      const res = await fetch(`${apiBaseUrl}/documents/${encodeURIComponent(filename)}/chunks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load chunks");
      setSelectedDocChunks(data);
    } catch (err) {
      showNotify(err.message || "Could not fetch document chunks.", "error");
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleReindexAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/reindex-all`, { method: "POST" });
      const data = await res.json();
      showNotify(data.message || "Reindexing complete!");
      await fetchDocsAndStats();
      if (onDocsChanged) onDocsChanged();
    } catch (err) {
      showNotify("Failed to reindex knowledge base.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-[#0c1017] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Knowledge Base & Vector Store
              </h2>
              <p className="text-xs text-slate-400">
                Manage indexed files, inspect vector chunks, and upload documents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
              notification.type === "error"
                ? "bg-rose-950/80 text-rose-200 border-b border-rose-800"
                : "bg-emerald-950/80 text-emerald-200 border-b border-emerald-800"
            }`}
          >
            {notification.type === "error" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Indexed Documents
              </span>
              <p className="text-lg font-extrabold text-white mt-0.5">
                {stats?.total_documents ?? documents.length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Total Vector Chunks
              </span>
              <p className="text-lg font-extrabold text-indigo-400 mt-0.5">
                {stats?.total_chunks ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Embedding Model
              </span>
              <p className="text-xs font-mono font-semibold text-emerald-400 mt-1 truncate">
                {stats?.embedding_model || "all-MiniLM-L6-v2"}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Database Engine
              </span>
              <p className="text-xs font-mono font-semibold text-slate-300 mt-1">
                ChromaDB (Cosine)
              </p>
            </div>
          </div>

          {/* Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-6 text-center bg-slate-900/30 hover:bg-indigo-950/10 transition-all">
            <input
              type="file"
              id="multi-doc-upload"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.docx,.txt,.md,.csv,.json,.py,.js,.ts,.html,.cpp,.c,.java,.go,.rs,.yml,.yaml"
            />
            <label
              htmlFor="multi-doc-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="p-3 rounded-full bg-indigo-600/10 text-indigo-400 mb-3 border border-indigo-500/20">
                <UploadCloud size={28} className={uploading ? "animate-bounce" : ""} />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {uploading ? "Extracting & Embedding Chunks..." : "Click or Drag & Drop Documents to Ingest"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports Multi-File Upload: PDF, DOCX, Markdown, Code (.py, .js, .ts), TXT, JSON, CSV
              </p>
            </label>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search indexed files..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleReindexAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Reindex All Files</span>
            </button>
          </div>

          {/* Document Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="col-span-6">Document Name</span>
              <span className="col-span-2 text-center">Chunks</span>
              <span className="col-span-2 text-center">Type</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {documents.length === 0
                  ? "No documents in Knowledge Base. Upload some files above to start!"
                  : "No matching documents found."}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto custom-scrollbar">
                {filteredDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 grid grid-cols-12 items-center text-xs hover:bg-slate-800/30 transition"
                  >
                    <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-2">
                      <FileText size={16} className="text-indigo-400 shrink-0" />
                      <span className="truncate font-medium text-slate-200" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                    <div className="col-span-2 text-center font-mono text-indigo-300">
                      {doc.chunk_count}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-mono text-slate-400">
                        {doc.file_type || doc.filename.split(".").pop()}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleInspectChunks(doc.filename)}
                        title="Inspect Chunks"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 transition"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.filename)}
                        title="Delete Document"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chunk Inspector Overlay */}
        {selectedDocChunks && (
          <div className="absolute inset-0 z-20 bg-[#090d16]/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Chunk Inspector: {selectedDocChunks.filename}
                </h3>
                <p className="text-xs text-slate-400">
                  Total {selectedDocChunks.total_chunks} segmented vector chunks
                </p>
              </div>
              <button
                onClick={() => setSelectedDocChunks(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
              {selectedDocChunks.chunks.map((chk, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-[11px] text-indigo-400 font-semibold mb-1.5 border-b border-slate-800/60 pb-1">
                    <span>Chunk #{chk.metadata?.chunk_index ?? i + 1} ({chk.metadata?.section || "Section"})</span>
                    <span className="text-slate-500 text-[10px]">
                      {chk.text.length} chars • Page {chk.metadata?.page || 1}
                    </span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {chk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
