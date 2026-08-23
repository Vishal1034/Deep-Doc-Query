import os
import re
import json
import time
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from dotenv import load_dotenv

from .ingestor import get_embedding_model, get_chroma_collection

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_PROVIDER = os.getenv("LLM_PROVIDER", "ollama") # "ollama" | "groq" | "openai" | "gemini"

def decompose_query(query: str) -> List[str]:
    """
    Agentic Query Analyzer:
    Identifies complex, multi-hop, or comparative questions and decomposes them into focused sub-queries.
    """
    clean_q = query.strip()
    sub_queries = [clean_q]
    
    lower = clean_q.lower()
    # Check for comparative queries
    if any(k in lower for k in ["compare", "difference between", "versus", " vs ", "relative to"]):
        parts = re.split(r"\b(?:and|with|versus|vs|to)\b", clean_q, flags=re.IGNORECASE)
        if len(parts) >= 2:
            sub1 = re.sub(r"^(?:compare|what is the difference between)\s+", "", parts[0], flags=re.IGNORECASE).strip()
            sub2 = parts[1].strip()
            if len(sub1) > 3 and len(sub2) > 3:
                sub_queries.extend([sub1, sub2])

    # Check for multi-part questions connected with 'also' or 'additionally'
    elif any(k in lower for k in [" and also ", " additionally ", " as well as "]):
        parts = re.split(r"\b(?:and also|additionally|as well as)\b", clean_q, flags=re.IGNORECASE)
        for p in parts:
            p_clean = p.strip()
            if len(p_clean) > 5 and p_clean not in sub_queries:
                sub_queries.append(p_clean)

    return sub_queries[:3]


def reformulate_query(query: str) -> str:
    """
    Agentic Self-Correction:
    Strips conversational fluff and extracts high-density keywords for expanded search.
    """
    fluff_patterns = [
        r"^(?:can you|could you|please|tell me|explain to me|what is|how do i|find|search for)\s+",
        r"\b(?:in the documents|in the codebase|in the files|from the text|according to the doc)\b"
    ]
    reformed = query
    for pat in fluff_patterns:
        reformed = re.sub(pat, "", reformed, flags=re.IGNORECASE).strip()
    return reformed if len(reformed) > 3 else query


def retrieve_scored_chunks(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Retrieves chunks with normalized cosine similarity scores (0.0 to 1.0).
    """
    collection = get_chroma_collection()
    model = get_embedding_model()

    if collection.count() == 0:
        return []

    # Generate query embedding
    query_emb = model.encode([query], show_progress_bar=False, normalize_embeddings=True).tolist()

    try:
        results = collection.query(
            query_embeddings=query_emb,
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        return []

    chunks = []
    if results and results.get("documents") and results["documents"][0]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
        distances = results["distances"][0] if results.get("distances") else [0.5] * len(docs)

        for doc_text, meta, dist in zip(docs, metas, distances):
            # Chroma with cosine distance: distance is in [0, 2].
            # Similarity score = 1.0 - (distance / 2.0)
            similarity = max(0.0, min(1.0, 1.0 - (float(dist) / 2.0)))
            chunks.append({
                "text": doc_text,
                "source": meta.get("source", "Document"),
                "file_type": meta.get("file_type", ""),
                "page": meta.get("page", 1),
                "section": meta.get("section", "Section"),
                "chunk_index": meta.get("chunk_index", 0),
                "similarity_score": round(similarity * 100, 1),
                "distance": round(float(dist), 4),
                "preview": doc_text[:180].replace("\n", " ") + ("..." if len(doc_text) > 180 else "")
            })

    return chunks


def agentic_retrieve(query: str, top_k: int = 4) -> Dict[str, Any]:
    """
    Full Agentic Reasoning Pipeline:
    1. Query Decomposition
    2. Multi-Vector Scored Retrieval
    3. Self-Correction & Query Expansion (if initial confidence is weak)
    4. Deduplication & Cross-Document Reranking
    """
    thoughts = []
    t0 = time.time()

    # Step 1: Query Analysis & Decomposition
    sub_queries = decompose_query(query)
    if len(sub_queries) > 1:
        thoughts.append({
            "step": "Query Decomposition",
            "detail": f"Detected multi-part question. Formulated {len(sub_queries)} sub-queries: {sub_queries}",
            "status": "success"
        })
    else:
        thoughts.append({
            "step": "Intent Analysis",
            "detail": f"Targeted query analyzed: '{query}'",
            "status": "success"
        })

    # Step 2: Multi-Pass Retrieval
    seen_texts = set()
    all_candidate_chunks = []

    for q in sub_queries:
        retrieved = retrieve_scored_chunks(q, top_k=top_k)
        for c in retrieved:
            text_hash = c["text"].strip()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                all_candidate_chunks.append(c)

    # Step 3: Self-Correction / Corrective RAG (CRAG)
    top_score = max([c["similarity_score"] for c in all_candidate_chunks], default=0.0)
    
    if top_score < 45.0 or len(all_candidate_chunks) == 0:
        reform = reformulate_query(query)
        thoughts.append({
            "step": "Self-Correction & Fallback (CRAG)",
            "detail": f"Initial similarity confidence was low ({top_score}%). Re-wrote query to '{reform}' and executing expanded semantic search.",
            "status": "warning"
        })
        corrected_chunks = retrieve_scored_chunks(reform, top_k=top_k)
        for c in corrected_chunks:
            text_hash = c["text"].strip()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                all_candidate_chunks.append(c)
    else:
        thoughts.append({
            "step": "Context Verification",
            "detail": f"Retrieved {len(all_candidate_chunks)} candidate chunks. Top relevance confidence: {top_score}%.",
            "status": "success"
        })

    # Step 4: Sort by similarity score and take best top_k
    all_candidate_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
    final_chunks = all_candidate_chunks[:top_k]

    sources_summary = list({f"{c['source']} (p.{c['page']})" for c in final_chunks})
    thoughts.append({
        "step": "Context Synthesis & Ranking",
        "detail": f"Selected top {len(final_chunks)} non-redundant snippets from {len(sources_summary)} document references in {round(time.time() - t0, 2)}s.",
        "status": "success"
    })

    return {
        "thoughts": thoughts,
        "chunks": final_chunks,
        "sources": [
            {
                "source": c["source"],
                "page": c["page"],
                "section": c["section"],
                "similarity_score": c["similarity_score"],
                "preview": c["preview"]
            }
            for c in final_chunks
        ]
    }


def build_agent_prompt(question: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Constructs an architectural RAG prompt with grounded context.
    """
    if not chunks:
        context_block = "No direct matching text found in local documents."
    else:
        context_parts = []
        for i, c in enumerate(chunks, 1):
            context_parts.append(
                f"--- [Snippet {i} | Source: {c['source']} | Page/Section: {c['section']} (Relevance: {c['similarity_score']}%) ] ---\n{c['text']}"
            )
        context_block = "\n\n".join(context_parts)

    return f"""You are a Lead AI Architect & Senior Technical Assistant.
Answer the user's question with high precision, grounded strictly in the provided context snippets.

STRICT INSTRUCTIONS:
1. Executive Summary: Begin with a clean, concise paragraph (2-3 sentences) explaining the key concept or high-level answer.
2. Technical Breakdown: Use clear bullet points with bold sub-headers for step-by-step details, parameters, or architectural logic.
3. Code & Examples: If code or config is involved, format it cleanly in Markdown code blocks with language tags.
4. Source Attribution: Explicitly reference document names and sections where relevant.
5. Honesty & Factuality: If the provided context does not contain sufficient data to answer fully, state clearly what is known from the docs and what is missing. Do NOT make up unsupported facts.

DOCUMENT CONTEXT:
{context_block}

USER QUESTION:
{question}

STRUCTURED ARCHITECTURAL ANSWER:"""


async def stream_agentic_response(
    query: str,
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
    ollama_host: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Asynchronous Server-Sent Events (SSE) generator yielding:
    - Thought steps (Agent reasoning)
    - Response tokens (Streamed generation)
    - Verified Citations
    - Completion [DONE]
    """
    try:
        # 1. Execute Agentic Reasoning & Retrieval
        rag_data = agentic_retrieve(query, top_k=4)
        thoughts = rag_data["thoughts"]
        chunks = rag_data["chunks"]
        citations = rag_data["sources"]

        # Stream all thought steps first
        for th in thoughts:
            yield f"data: {json.dumps({'type': 'thought', 'step': th['step'], 'detail': th['detail'], 'status': th['status']})}\n\n"

        system_prompt = build_agent_prompt(query, chunks)

        active_provider = (provider or DEFAULT_PROVIDER).lower()
        active_model = model_name or (OLLAMA_MODEL if active_provider == "ollama" else "llama-3.3-70b-versatile")
        active_ollama_host = ollama_host or OLLAMA_HOST

        streamed_success = False

        # --- Option A: Cloud LLM (Groq / OpenAI compatible) ---
        if active_provider in ["groq", "openai", "gemini"] or api_key:
            cloud_key = api_key or (GROQ_API_KEY if active_provider == "groq" else (OPENAI_API_KEY if active_provider == "openai" else GEMINI_API_KEY))
            
            base_url = "https://api.groq.com/openai/v1" if active_provider == "groq" else (
                "https://api.openai.com/v1" if active_provider == "openai" else "https://generativelanguage.googleapis.com/v1beta/openai"
            )
            
            if cloud_key:
                try:
                    headers = {
                        "Authorization": f"Bearer {cloud_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": active_model if active_provider != "groq" else "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "You are a Senior Technical AI Assistant."},
                            {"role": "user", "content": system_prompt}
                        ],
                        "stream": True,
                        "temperature": 0.2
                    }

                    async with httpx.AsyncClient(timeout=45.0) as client:
                        async with client.stream("POST", f"{base_url}/chat/completions", json=payload, headers=headers) as response:
                            if response.status_code == 200:
                                async for line in response.aiter_lines():
                                    if line.startswith("data: "):
                                        chunk_str = line[6:].strip()
                                        if chunk_str == "[DONE]":
                                            break
                                        try:
                                            chunk_json = json.loads(chunk_str)
                                            delta = chunk_json["choices"][0].get("delta", {}).get("content", "")
                                            if delta:
                                                yield f"data: {json.dumps({'type': 'token', 'token': delta})}\n\n"
                                                streamed_success = True
                                        except Exception:
                                            pass
                except Exception as e:
                    print(f"Cloud provider error: {e}")

        # --- Option B: Local Ollama ---
        if not streamed_success and active_provider == "ollama":
            try:
                import ollama
                client = ollama.Client(host=active_ollama_host)
                stream = client.chat(
                    model=active_model,
                    messages=[{"role": "user", "content": system_prompt}],
                    stream=True
                )
                for part in stream:
                    token = part.get("message", {}).get("content", "")
                    if token:
                        yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
                        streamed_success = True
            except Exception as e:
                print(f"Local Ollama stream error: {e}")

        # --- Option C: Smart Fallback Knowledge Synthesizer (Zero-Crash Guarantee) ---
        if not streamed_success:
            # If Ollama is offline and no cloud key is provided, synthesize the grounded context directly
            fallback_text = ""
            if not chunks:
                fallback_text = (
                    "### ⚠️ No Relevant Knowledge Found\n\n"
                    "I searched through your indexed documents, but could not find matching information for your query. "
                    "Please upload the relevant `.pdf`, `.docx`, `.md`, or code files into the Knowledge Base and try again!"
                )
            else:
                top_source = chunks[0]["source"]
                fallback_text = (
                    f"### 📋 Knowledge Synthesis for: *\"{query}\"*\n\n"
                    f"Based on the indexed document **`{top_source}`** and related sources, here is the relevant grounded context:\n\n"
                )
                for idx, c in enumerate(chunks, 1):
                    fallback_text += (
                        f"#### {idx}. Source: `{c['source']}` (Confidence: {c['similarity_score']}%)\n"
                        f"> {c['text'].strip()}\n\n"
                    )
                fallback_text += (
                    "\n---\n*💡 Tip: Connect a local Ollama instance (`ollama run llama3`) or provide a Groq/Gemini API key in Model Settings for fully generative AI synthesis.*"
                )

            # Stream words with smooth cadence
            words = fallback_text.split(" ")
            for w in words:
                yield f"data: {json.dumps({'type': 'token', 'token': w + ' '})}\n\n"

        # 3. Stream Citations and Done Event
        yield f"data: {json.dumps({'type': 'citations', 'sources': citations})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"
