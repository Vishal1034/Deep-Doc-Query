import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

# --- Configuration ---
# Use absolute paths or relative from the backend directory
BASE_BACKEND_DIR = Path(__file__).resolve().parents[1]
DOCS_PATH = os.getenv("DOCS_DIR", str(BASE_BACKEND_DIR / "docs"))
CHROMA_PATH = os.getenv("CHROMA_PATH", str(BASE_BACKEND_DIR / "data" / "chroma"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

def ingest_docs():
    # 1. Load Documents
    # This loader is "smart"—it detects the file type automatically
    print(f"📦 Loading documents from {DOCS_PATH}...")
    loader = DirectoryLoader(
        DOCS_PATH, 
        glob="./**/*",  # Grabs everything in the folder
        show_progress=True,
        use_multithreading=True
    )
    
    raw_documents = loader.load()
    print(f"✅ Loaded {len(raw_documents)} documents.")
    
    if len(raw_documents) == 0:
        print("⚠️ No documents found to ingest.")
        return None

    # 2. Split Text (Stage 1 Architecture: 500 token chunks, 50 overlap)
    # We use characters as a proxy for tokens here
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
        add_start_index=True,
    )
    
    chunks = text_splitter.split_documents(raw_documents)
    print(f"✂️ Split into {len(chunks)} chunks.")

    # 3. Create Embeddings & Store in ChromaDB
    print(f"🧬 Generating embeddings ({EMBEDDING_MODEL})...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    # This creates the local DB and saves it to disk
    vector_db = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PATH
    )
    
    print(f"💾 Vector Database saved to {CHROMA_PATH}")
    return vector_db

if __name__ == "__main__":
    # Ensure folders exist
    os.makedirs(DOCS_PATH, exist_ok=True)
    os.makedirs(os.path.dirname(CHROMA_PATH), exist_ok=True)
    ingest_docs()
