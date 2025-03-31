from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging
import math
import asyncio
import os
from typing import Optional

# Import vector database and embedding model
from db.vector_db import vector_db
from models.embedding_model import create_embeddings

from openai import OpenAI
import httpx

logger = logging.getLogger(__name__)

# LM Studio API Configuration
LM_STUDIO_URL = "http://localhost:1234/v1"
LM_STUDIO_API_KEY = "lm-studio"

# Groq API Configuration
GROQ_API_URL = "https://api.groq.com/openai/v1"
GROQ_MODELS = {
    "llama3-8b-8192": {
        "name": "Llama-3 8B",
        "description": "Balanced speed and quality, good for most queries",
        "max_tokens": 8192
    },
    "llama3-70b-8192": {
        "name": "Llama-3 70B",
        "description": "Highest quality responses, best reasoning abilities",
        "max_tokens": 8192
    },
    "gemma-7b-it": {
        "name": "Gemma 7B",
        "description": "Fast, efficient model for simpler queries",
        "max_tokens": 8192
    },
    "mixtral-8x7b-32768": {
        "name": "Mixtral 8x7B",
        "description": "Strong performance with longer context window",
        "max_tokens": 32768
    }
}
DEFAULT_GROQ_MODEL = "llama3-8b-8192"

router = APIRouter(
    prefix="/query",
    tags=["query"],
    responses={404: {"description": "Not found"}},
)

class QueryRequest(BaseModel):
    question: str
    llm_choice: str = "local"  # Default to local LLM
    model: Optional[str] = None  # Optional model selection for Groq
    api_key: Optional[str] = None  # Optional API key for remote LLMs

class QueryResponse(BaseModel):
    answer: str
    source_urls: list[str] = []
    model_used: Optional[str] = None

def cosine_similarity(a: list, b: list) -> float:
    # Simple cosine similarity: dot(a,b)/(||a||*||b||)
    dot_product = sum(x*y for x,y in zip(a, b))
    norm_a = math.sqrt(sum(x*x for x in a))
    norm_b = math.sqrt(sum(x*x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def get_openai_client(llm_choice: str, api_key: Optional[str] = None):
    """Get appropriate OpenAI client based on LLM choice."""
    if llm_choice == "local":
        return OpenAI(base_url=LM_STUDIO_URL, api_key=LM_STUDIO_API_KEY)
    elif llm_choice == "groq":
        if not api_key:
            raise ValueError("A valid Groq API key is required to use Groq models")
        return OpenAI(base_url=GROQ_API_URL, api_key=api_key)
    else:
        raise ValueError(f"Unsupported LLM choice: {llm_choice}")

def get_model_for_provider(llm_choice: str, model_id: Optional[str] = None):
    """Get appropriate model ID based on provider and user selection."""
    if llm_choice == "local":
        # When using local LM-Studio, use whatever model is loaded
        return "deepseek-r1-distill-qwen-7b"
        
    elif llm_choice == "groq":
        # For Groq, use the selected model or default
        if model_id and model_id in GROQ_MODELS:
            return model_id
        return DEFAULT_GROQ_MODEL
        
    # Fallback
    return "deepseek-r1-distill-qwen-7b"

async def query_llm(question: str, llm_choice: str = "local", model: Optional[str] = None, api_key: Optional[str] = None) -> QueryResponse:
    logger.info(f"Processing query using {llm_choice} LLM with model {model or 'default'}: {question}")
    
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
        model_info = f"{GROQ_MODELS.get(model, {}).get('name', model)}" if llm_choice == "groq" and model else "Local LLM"
        return QueryResponse(
            answer="I don't have enough information to answer that question.",
            source_urls=[],
            model_used=model_info
        )
    
    context = best_doc["text"]
    source_url = best_doc["metadata"].get("source_url", "")
    
    # Prepare prompt with context for LLM
    prompt = f"""Answer the question based only on the following context. If the context doesn't contain the answer, say "I don't have information about that in my knowledge base."

Context:
{context}

Question: {question}

Answer:"""

    try:
        # Get appropriate client based on LLM choice
        client = get_openai_client(llm_choice, api_key)
        
        # Get appropriate model based on provider and user selection
        model_id = get_model_for_provider(llm_choice, model)
        
        # Set max tokens based on model
        if llm_choice == "groq" and model_id in GROQ_MODELS:
            max_tokens = min(1500, GROQ_MODELS[model_id]["max_tokens"] // 4)  # Use 1/4 of available context
        else:
            max_tokens = 800  # Default for local models
        
        # Log model selection
        logger.info(f"Using model: {model_id} with max_tokens: {max_tokens}")
        
        # Call selected LLM with the combined prompt
        response = client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        answer = response.choices[0].message.content
        
        # Get readable model name for the response
        if llm_choice == "groq" and model_id in GROQ_MODELS:
            model_used = GROQ_MODELS[model_id]["name"]
        else:
            model_used = "Local LLM (LM-Studio)"
            
        return QueryResponse(
            answer=answer, 
            source_urls=[source_url] if source_url else [],
            model_used=model_used
        )
    
    except ValueError as ve:
        # Handle missing API keys or other validation errors
        logger.error(f"Validation error: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        # Handle all other errors from LLM calls
        logger.error(f"Error querying LLM: {e}", exc_info=True)
        
        # Provide different error messages based on the LLM provider
        if llm_choice == "local":
            error_msg = f"Local LLM query failed. Is LM-Studio running at {LM_STUDIO_URL}? Error: {str(e)}"
        else:
            model_name = GROQ_MODELS.get(model, {}).get("name", model) if model else "default"
            error_msg = f"Groq API query with model {model_name} failed. Please check your API key and try again. Error: {str(e)}"
            
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/")
async def query_knowledge(query: QueryRequest):
    try:
        # Validate Groq API key requirement before proceeding
        if query.llm_choice == "groq" and not query.api_key:
            logger.error("Groq API key missing")
            raise HTTPException(
                status_code=400, 
                detail="Groq API key is required when using Groq models"
            )
            
        logger.info(f"Received query using {query.llm_choice} LLM with model {query.model or 'default'}: {query.question}")
        response = await query_llm(query.question, query.llm_choice, query.model, query.api_key)
        return response
    except ValueError as ve:
        # Convert ValueError to HTTPException with appropriate status code
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status code and detail
        raise
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
