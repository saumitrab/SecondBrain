"""
Ingest API endpoint for SecondBrain.
Handles content ingestion, processing, and embedding.
"""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, HttpUrl
import asyncio
from fastapi import APIRouter, BackgroundTasks

# Import models and database
from models.embedding_model import create_embeddings
from db.vector_db import add_to_vector_db

# Set up logging
logger = logging.getLogger(__name__)

# Set up router
router = APIRouter(
    prefix="/ingest",
    tags=["ingest"],
    responses={404: {"description": "Not found"}},
)

# Define data models
class ImageData(BaseModel):
    """Model for image data from webpages."""
    src: HttpUrl
    alt: Optional[str] = ""
    width: Optional[int] = 0
    height: Optional[int] = 0

class VideoTranscription(BaseModel):
    """Model for video transcription data."""
    src: Optional[str] = ""
    type: Optional[str] = ""
    duration: Optional[float] = 0
    transcription: Optional[str] = ""

class WebpageContent(BaseModel):
    """Model for content extracted from a webpage."""
    url: HttpUrl
    title: str
    textContent: str
    images: List[ImageData] = Field(default_factory=list)
    videoTranscriptions: List[VideoTranscription] = Field(default_factory=list)
    timestamp: str

# Background task for processing content
async def process_content_async(content: WebpageContent):
    """
    Process webpage content asynchronously.
    1. Extract text from content and media
    2. Generate embeddings
    3. Store in vector database
    """
    try:
        logger.info(f"Processing content from URL: {content.url}")
        
        # Combine all text content
        all_text = [content.title, content.textContent]
        
        # Add image alt text
        for img in content.images:
            if img.alt and len(img.alt) > 0:
                all_text.append(f"Image alt text: {img.alt}")
        
        # Add video transcriptions
        for video in content.videoTranscriptions:
            if video.transcription and len(video.transcription) > 0:
                all_text.append(f"Video transcription: {video.transcription}")
        
        combined_text = " ".join(all_text)
        
        # Generate embeddings
        embeddings = await create_embeddings(
            text=combined_text,
            metadata={
                "source_url": str(content.url),
                "title": content.title,
                "timestamp": content.timestamp
            }
        )
        
        # Store in vector database
        document_id = await add_to_vector_db(
            text=combined_text,
            embeddings=embeddings,
            metadata={
                "source_url": str(content.url),
                "title": content.title,
                "timestamp": content.timestamp
            }
        )
        
        logger.info(f"Successfully processed and stored content with ID: {document_id}")
        
    except Exception as e:
        logger.error(f"Error processing content: {e}", exc_info=True)
        raise

# Ingest endpoint
@router.post("/")
async def ingest_content(content: WebpageContent, background_tasks: BackgroundTasks):
    """
    Ingest content extracted from a webpage.
    
    The content is processed asynchronously in a background task.
    """
    try:
        logger.info(f"Received content from URL: {content.url}")
        
        # Add the processing task to the background tasks
        background_tasks.add_task(process_content_async, content)
        
        return {
            "status": "processing",
            "message": "Content received and queued for processing",
            "url": content.url
        }
        
    except Exception as e:
        logger.error(f"Error ingesting content: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error ingesting content: {str(e)}",
            "url": content.url
        }
