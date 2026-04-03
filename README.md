# Local RAG Assistant

A local Retrieval-Augmented Generation project with:
- FastAPI backend for ingestion and retrieval.
- ChromaDB for local vector storage.
- React + Vite + Tailwind frontend.

## Backend Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Add documents into `backend/docs` (`.md` and `.pdf`).
4. Run API server from `backend`:

```bash
uvicorn main:app --reload
```

## API Endpoints

- `GET /health` - health check
- `POST /ingest` - load docs, split, embed, and store in ChromaDB
- `POST /retrieve` - similarity search over ingested chunks

### Retrieve Request Body

```json
{
  "query": "What is this project about?",
  "k": 4
}
```

## Frontend Setup

From `frontend` directory:

```bash
npm install
npm run dev
```

Frontend runs on `http://127.0.0.1:5173` and calls backend on `http://127.0.0.1:8000`.
