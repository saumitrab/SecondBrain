import uuid
import asyncio

# For the MVP, use an in-memory dictionary to simulate vector DB storage.
vector_db = {}

async def add_to_vector_db(text: str, embeddings: list, metadata: dict) -> str:
    document_id = str(uuid.uuid4())
    vector_db[document_id] = {
        "text": text,
        "embeddings": embeddings,
        "metadata": metadata
    }
    return document_id