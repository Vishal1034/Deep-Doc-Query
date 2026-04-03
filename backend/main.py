import os
import shutil
from pathlib import Path

import json
import ollama
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, HTTPException
from fastapi import File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from modules.ingestor import ingest_docs
from modules.retriever import get_rag_chain

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DOCS_DIR = Path(os.getenv("DOCS_DIR", str(BASE_DIR / "docs")))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
APP_TITLE = os.getenv("APP_TITLE", "Local Coding RAG API")

raw_cors_origins = os.getenv("CORS_ORIGINS", "*")
if raw_cors_origins.strip() == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]

app = FastAPI(title=APP_TITLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the RAG chain once at startup
rag_chain = get_rag_chain()


class ChatRequest(BaseModel):
    message: str


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict:
    try:
        DOCS_DIR.mkdir(parents=True, exist_ok=True)
        file_path = DOCS_DIR / file.filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        ingest_docs()

        return {"message": f"Successfully uploaded and indexed {file.filename}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/chat/clear")
async def clear_chat() -> dict:
    try:
        return {"message": "Chat history cleared"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/chat/stream")
async def chat_streaming(request: ChatRequest):
    async def event_generator():
        try:
            docs = rag_chain.retriever.invoke(request.message)
            context = "\n\n".join([doc.page_content for doc in docs])
            sources = list(set(filter(None, [doc.metadata.get("source") for doc in docs])))

            prompt = f"""You are a Senior Software Architect. Use the provided context to answer the user's coding question.

STRICT RULES:
1. Start with a brief paragraph (2-3 sentences) explaining the high-level concept or "why".
2. Use a bulleted list for technical steps, requirements, or code-specific details.
3. If the answer involves a process, use a numbered list.
4. Use Markdown for code blocks.
5. If the context does not contain the answer, state "I do not have enough information in the local docs."

Context:
{context}

Question: {request.message}

Helpful Structured Answer:"""

            stream = ollama.chat(
                model=OLLAMA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                host=OLLAMA_HOST,
            )

            for chunk in stream:
                content = chunk["message"]["content"]
                yield f"data: {json.dumps({'token': content})}\n\n"

            yield f"data: {json.dumps({'sources': sources})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
def health_check() -> dict:
    return {"status": "online", "model": OLLAMA_MODEL, "ollama_host": OLLAMA_HOST}


@app.post("/chat")
async def chat_endpoint(request: ChatRequest) -> dict:
    try:
        # Invoke the RAG chain
        response = rag_chain.invoke({"query": request.message})

        # Extract sources to show in the UI
        sources = [doc.metadata.get("source") for doc in response["source_documents"]]

        return {
            "answer": response["result"],
            "sources": list(set(filter(None, sources))),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
    )
