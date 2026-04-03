# Getting Started with Local RAG Assistant

## Overview
The Local RAG Assistant is a Retrieval-Augmented Generation (RAG) system that combines local LLMs with vector databases for intelligent document processing.

## Architecture
- **Backend**: FastAPI server with document ingestion and retrieval pipelines
- **Vector Database**: ChromaDB for efficient document embedding storage
- **LLM**: Ollama-powered llama3 model for generating responses
- **Embeddings**: HuggingFace all-MiniLM-L6-v2 for text vectorization

## Features
1. Document ingestion from markdown and PDF files
2. Semantic search across document collections
3. Context-aware response generation
4. Fully local operation (no external API calls)

## Installation
Install dependencies from requirements.txt:
```bash
pip install -r requirements.txt
```

## Quick Start
1. Place documents in `backend/docs/`
2. Run the ingestor to build the vector database
3. Query the system through the web interface

## Components
- **Ingestor**: Processes documents and creates embeddings
- **Retriever**: Searches vector database for relevant chunks
- **Generator**: Uses LLM to synthesize responses from retrieved context

## Performance Notes
- Chunk size: 500 characters with 50 character overlap
- Model: llama3 (13B parameters)
- Embeddings: all-MiniLM-L6-v2 (384 dimensions)
