import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma

load_dotenv()

# --- Configuration ---
CHROMA_PATH = os.getenv("CHROMA_PATH", str(Path(__file__).resolve().parents[1] / "data" / "chroma"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))


class LocalRAGChain:
    def __init__(self, retriever, llm, prompt_template: str):
        self.retriever = retriever
        self.llm = llm
        self.prompt_template = prompt_template

    def invoke(self, payload: dict) -> dict:
        query = payload.get("query", "").strip()
        if not query:
            return {"result": "", "source_documents": []}

        docs = self.retriever.invoke(query)
        context = "\n\n".join(doc.page_content for doc in docs)
        full_prompt = self.prompt_template.format(context=context, question=query)
        response = self.llm.invoke(full_prompt)

        return {"result": response, "source_documents": docs}

def get_rag_chain():
    # 1. Load the existing Vector DB
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
    retriever = vector_db.as_retriever(search_kwargs={"k": 3})

    # 2. Setup the Local LLM (Ollama)
    # temperature=0.1 ensures the model stays factual and doesn't "hallucinate"
    llm = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_HOST, temperature=LLM_TEMPERATURE)

    # 3. Define a STRUCTURED Prompt Template
    # Enforces high-quality formatted output: paragraphs for concepts, bullets for technical details
    prompt_template = """You are a Senior Software Architect. Use the provided context to answer the user's coding question.

STRICT RULES:
1. Start with a brief paragraph (2-3 sentences) explaining the high-level concept or "why".
2. Use a bulleted list for technical steps, requirements, or code-specific details.
3. If the answer involves a process, use a numbered list.
4. Use Markdown for code blocks.
5. If the context does not contain the answer, state "I do not have enough information in the local docs."

Context:
{context}

Question: {question}

Helpful Structured Answer:"""
    
    # 4. Build an invoke-compatible chain object
    return LocalRAGChain(retriever=retriever, llm=llm, prompt_template=prompt_template)


if __name__ == "__main__":
    chain = get_rag_chain()
    query = "What is this project about?"
    response = chain.invoke({"query": query})

    print("\n--- RESPONSE ---")
    print(response["result"])
    print("\n--- SOURCES USED ---")
    for doc in response["source_documents"]:
        print(f"- {doc.metadata.get('source', 'Unknown')}")
