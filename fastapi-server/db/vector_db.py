import uuid
import asyncio
import logging
import chromadb
from chromadb.config import Settings
import os

logger = logging.getLogger(__name__)

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="./vector_store")

# Create or get the collection for our documents
try:
    collection = client.get_or_create_collection(name="secondbrain_documents")
    logger.info(f"ChromaDB collection initialized with {collection.count()} documents")
except Exception as e:
    logger.error(f"Error initializing ChromaDB: {e}")
    raise

async def add_to_vector_db(text: str, embeddings: list, metadata: dict) -> str:
    """Add content to ChromaDB with embeddings and metadata"""
    document_id = str(uuid.uuid4())
    
    try:
        collection.add(
            ids=[document_id],
            embeddings=[embeddings],  # ChromaDB expects a list of embeddings
            documents=[text],
            metadatas=[metadata]
        )
        logger.info(f"Added document {document_id} to ChromaDB")
        return document_id
    except Exception as e:
        logger.error(f"Error adding to ChromaDB: {e}")
        raise

async def query_vector_db(query_embedding: list, limit: int = 3, threshold: float = 0.5):
    """
    Query documents from ChromaDB based on embedding similarity
    
    Args:
        query_embedding: The embedding vector of the query
        limit: Maximum number of results to return
        threshold: Minimum similarity threshold
        
    Returns:
        Tuple of (list of documents, list of similarity scores)
    """
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"]
        )
        
        # Check if we have any results
        if not results["ids"] or not results["ids"][0]:
            logger.info("No results found in vector database")
            return None, 0
        
        # Process all returned results
        docs = []
        similarities = []
        
        for i in range(len(results["documents"][0])):
            # Convert distance to similarity score (1 - distance for cosine distance)
            similarity = 1 - results["distances"][0][i]
            
            # Only include results above threshold
            if similarity >= threshold:
                doc_id = results["ids"][0][i]
                text = results["documents"][0][i]
                metadata = results["metadatas"][0][i]
                
                docs.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": metadata,
                    "similarity": similarity
                })
                similarities.append(similarity)
        
        if not docs:
            logger.info(f"No documents found with similarity above threshold {threshold}")
            return None, 0
            
        return docs, similarities
        
    except Exception as e:
        logger.error(f"Error querying ChromaDB: {e}")
        raise