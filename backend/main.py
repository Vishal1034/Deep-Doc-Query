import os
import shutil
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from modules.ingestor import (
    DOCS_PATH,
    index_single_file,
    list_indexed_documents,
    get_document_chunks,
    delete_document_from_db,
    get_collection_statistics,
    ingest_all_docs,
)
from modules.agent import (
    stream_agentic_response,
    agentic_retrieve,
    build_agent_prompt,
    OLLAMA_MODEL,
    OLLAMA_HOST,
)

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
APP_TITLE = os.getenv("APP_TITLE", "Deep Doc Query - Agentic RAG Platform")

raw_cors_origins = os.getenv("CORS_ORIGINS", "*")
if raw_cors_origins.strip() == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]

cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")
if cors_origins == ["*"]:
    cors_origin_regex = None

app = FastAPI(
    title=APP_TITLE,
    description="High-Performance Agentic RAG Engine with dynamic reasoning, self-correction, and multi-format document management.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatStreamRequest(BaseModel):
    message: str
    provider: Optional[str] = "ollama"  # "ollama" | "groq" | "gemini" | "openai"
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    ollama_host: Optional[str] = None


@app.get("/health")
def health_check():
    stats = get_collection_statistics()
    return {
        "status": "online",
        "version": "2.0.0",
        "app_title": APP_TITLE,
        "default_ollama_model": OLLAMA_MODEL,
        "ollama_host": OLLAMA_HOST,
        "collection_stats": stats
    }


@app.get("/stats")
def get_stats():
    return get_collection_statistics()


@app.get("/documents")
def get_documents():
    return {"documents": list_indexed_documents()}


@app.get("/documents/{filename}/chunks")
def get_chunks(filename: str):
    chunks = get_document_chunks(filename)
    if not chunks:
        raise HTTPException(status_code=404, detail=f"No chunks found for document: {filename}")
    return {"filename": filename, "total_chunks": len(chunks), "chunks": chunks}


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    success = delete_document_from_db(filename)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found or could not be removed.")
    return {"message": f"Document '{filename}' deleted successfully."}


@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    DOCS_PATH.mkdir(parents=True, exist_ok=True)
    results = []

    for file in files:
        try:
            file_path = DOCS_PATH / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            index_res = index_single_file(file_path)
            results.append(index_res)
        except Exception as exc:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(exc)
            })

    return {
        "message": f"Processed {len(files)} file(s).",
        "results": results
    }


@app.post("/reindex-all")
def reindex_all():
    summary = ingest_all_docs()
    return {"message": "Reindexed knowledge base successfully", "summary": summary}


@app.post("/chat/stream")
async def chat_stream_endpoint(request: ChatStreamRequest):
    """
    Server-Sent Events streaming endpoint with live Agent Reasoning Thoughts,
    token-by-token synthesis, and verified citations.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Empty query provided.")

    return StreamingResponse(
        stream_agentic_response(
            query=request.message.strip(),
            provider=request.provider,
            model_name=request.model_name,
            api_key=request.api_key,
            ollama_host=request.ollama_host
        ),
        media_type="text/event-stream"
    )


@app.post("/chat")
async def chat_endpoint(request: ChatStreamRequest):
    """
    Non-streaming Agentic RAG endpoint.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Empty query provided.")

    rag_data = agentic_retrieve(request.message.strip(), top_k=4)
    return {
        "query": request.message,
        "thoughts": rag_data["thoughts"],
        "sources": rag_data["sources"],
        "context_snippets_count": len(rag_data["chunks"])
    }


@app.post("/chat/clear")
def clear_chat():
    return {"message": "Conversation context cleared."}


@app.get("/models")
def get_available_models():
    return {
        "providers": [
            {
                "id": "ollama",
                "name": "Local Ollama (100% Private)",
                "models": ["llama3", "mistral", "qwen2.5-coder", "phi3", "llama3.2"],
                "default": OLLAMA_MODEL
            },
            {
                "id": "groq",
                "name": "Groq Cloud (Ultra Fast)",
                "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
                "requires_api_key": True
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
                "requires_api_key": True
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "models": ["gpt-4o-mini", "gpt-4o"],
                "requires_api_key": True
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn

    DOCS_PATH.mkdir(parents=True, exist_ok=True)
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
    )
