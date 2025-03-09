"""
Main FastAPI application for SecondBrain.
This file initializes the API and includes all routes.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API routes
from api.ingest import router as ingest_router
from api.query import router as query_router
from api.status import router as status_router

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("secondbrain.log")
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SecondBrain API",
    description="API for SecondBrain content extraction, embedding, and LLM Q&A",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(status_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint returning basic API information."""
    return {
        "name": "SecondBrain API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/ingest - Process and embed content",
            "/query - Query the knowledge base",
            "/status - Get system status information"
        ]
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize components on application startup."""
    logger.info("Starting SecondBrain API")
    # Any additional initialization can go here

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown."""
    logger.info("Shutting down SecondBrain API")
    # Any cleanup code can go here

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
