from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

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

def simulate_llm_response(question: str) -> QueryResponse:
    # For the MVP, we simulate the LLM by replying "I don't know"
    logger.info(f"Simulating LLM response for: {question}")
    return QueryResponse(answer="I don't know", source_urls=[])

@router.post("/")
async def query_knowledge(query: QueryRequest):
    try:
        logger.info(f"Received query: {query.question}")
        response = simulate_llm_response(query.question)
        return response
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
