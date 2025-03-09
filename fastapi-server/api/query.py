from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
import math
import asyncio

# Import vector database and embedding model
from db.vector_db import vector_db
from models.embedding_model import create_embeddings

from openai import OpenAI

logger = logging.getLogger(__name__)

# LM Studio API Configuration
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

router = APIRouter(
    prefix="/query",
    tags=["query"],
    responses={404: {"description": "Not found"}},
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    source_urls: list[str] = []

def cosine_similarity(a: list, b: list) -> float:
    # Simple cosine similarity: dot(a,b)/(||a||*||b||)
    dot_product = sum(x*y for x,y in zip(a, b))
    norm_a = math.sqrt(sum(x*x for x in a))
    norm_b = math.sqrt(sum(x*x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

async def query_llm(question: str) -> QueryResponse:
    logger.info(f"Processing query: {question}")
    # Generate embedding for the query
    question_embedding = await create_embeddings(question, {})
    
    # Retrieve the best matching document in the vector_db
    best_similarity = 0.0
    best_doc = None
    for doc in vector_db.values():
        # doc["embeddings"] is a list, compare with question_embedding
        sim = cosine_similarity(question_embedding, doc["embeddings"])
        if sim > best_similarity:
            best_similarity = sim
            best_doc = doc
    THRESHOLD = 0.7  # similarity threshold
    if best_similarity < THRESHOLD or not best_doc:
        logger.info("No sufficient context found in vector db.")
        return QueryResponse(answer="I don't know", source_urls=[])
    
    context = best_doc["text"]
    source_url = best_doc["metadata"].get("source_url", "")
    
    # Prepare prompt with context for LLM
    prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    try:
        # Call local LLM with the combined prompt
        response = client.chat.completions.create(
            model="deepseek-r1-distill-qwen-7b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        answer = response.choices[0].message.content
        return QueryResponse(answer=answer, source_urls=[source_url] if source_url else [])
    except Exception as e:
        logger.error(f"Error querying LLM: {e}", exc_info=True)
        raise Exception(f"LLM query failed: {str(e)}")

@router.post("/")
async def query_knowledge(query: QueryRequest):
    try:
        logger.info(f"Received query: {query.question}")
        response = await query_llm(query.question)
        return response
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
