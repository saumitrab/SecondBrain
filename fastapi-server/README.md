# FastAPI Server for SecondBrain

This FastAPI server provides endpoints to:
- Ingest webpage content asynchronously (/ingest)
- Query the embedded knowledge (/query)
- Check system status (/status)

It uses a Sentence Transformer model for generating embeddings and a simple in-memory solution simulating a vector database.

Instructions:
1. Install requirements (e.g., fastapi, uvicorn, sentence-transformers).
2. Run the server via: `uvicorn main:app --host 0.0.0.0 --port 8000`
