"""
Ingest API endpoint for SecondBrain.
Handles content ingestion, processing, and embedding.
"""

import logging
import uuid
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

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Split text into smaller, meaningful chunks with potential overlap.
    
    Args:
        text: The text to chunk
        chunk_size: Target size of each chunk in characters
        chunk_overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    # If text is shorter than chunk size, return it as a single chunk
    if len(text) <= chunk_size:
        return [text]
    
    # Split text into sentences
    sentences = text.replace('\n', ' ').split('. ')
    sentences = [s + '.' if not s.endswith('.') else s for s in sentences]
    
    chunks = []
    current_chunk = []
    current_chunk_len = 0
    
    for sentence in sentences:
        sentence_len = len(sentence)
        
        # If adding this sentence would exceed chunk size, store current chunk and start a new one
        if current_chunk_len + sentence_len > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))
            
            # Keep overlap sentences for the next chunk
            overlap_size = 0
            overlap_sentences = []
            
            # Work backwards through current chunk to find overlap sentences
            for s in reversed(current_chunk):
                if overlap_size + len(s) <= chunk_overlap:
                    overlap_sentences.insert(0, s)
                    overlap_size += len(s)
                else:
                    break
                    
            # Start new chunk with overlap sentences
            current_chunk = overlap_sentences
            current_chunk_len = overlap_size
        
        # Add the current sentence to the chunk
        current_chunk.append(sentence)
        current_chunk_len += sentence_len
    
    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

# Background task for processing content
async def process_content_async(content: WebpageContent):
    """
    Process webpage content asynchronously.
    1. Extract text from content and media
    2. Chunk the text
    3. Generate embeddings for each chunk
    4. Store chunks in vector database
    """
    try:
        logger.info(f"Processing content from URL: {content.url}")
        
        # Combine all text content
        all_text = [f"Title: {content.title}", f"Content: {content.textContent}"]
        
        # Add image alt text
        for img in content.images:
            if img.alt and len(img.alt) > 0:
                all_text.append(f"Image alt text: {img.alt}")
        
        # Add video transcriptions
        for video in content.videoTranscriptions:
            if video.transcription and len(video.transcription) > 0:
                all_text.append(f"Video transcription: {video.transcription}")
        
        combined_text = " ".join(all_text)
        
        # Generate a document ID for the overall content
        document_id = str(uuid.uuid4())
        
        # Create chunks from the combined text
        chunks = chunk_text(combined_text)
        logger.info(f"Created {len(chunks)} chunks from content")
        
        # Process each chunk
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}-chunk-{i}"
            
            # Generate embeddings for this chunk
            embeddings = await create_embeddings(
                text=chunk,
                metadata={}  # Empty metadata for embedding generation
            )
            
            # Create enhanced metadata for the chunk
            metadata = {
                "source_url": str(content.url),
                "title": content.title,
                "timestamp": content.timestamp,
                "document_id": document_id,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
            
            # Store chunk in vector database
            await add_to_vector_db(
                text=chunk,
                embeddings=embeddings,
                metadata=metadata
            )
            
            logger.info(f"Stored chunk {i+1}/{len(chunks)} with ID: {chunk_id}")
        
        logger.info(f"Successfully processed and stored all chunks for document {document_id}")
        
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
