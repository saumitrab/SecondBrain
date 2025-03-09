from sentence_transformers import SentenceTransformer
import asyncio

# Initialize the Sentence Transformer for MVP; model can be made configurable later.
model = SentenceTransformer('all-MiniLM-L6-v2')

async def create_embeddings(text: str, metadata: dict) -> list:
    # Run the compute-bound model.encode in a thread pool to avoid blocking event loop.
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(None, model.encode, text)
    return embeddings