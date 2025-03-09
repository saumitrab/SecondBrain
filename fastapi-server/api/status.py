from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/status",
    tags=["status"],
    responses={404: {"description": "Not found"}},
)

# Dummy async function simulating database document count retrieval
async def get_document_count() -> int:
    # ...existing code or actual logic...
    return 0  # For the MVP, return 0 as the default count

@router.get("/")
async def get_status():
    try:
        total_docs = await get_document_count()
        return {"total_documents": total_docs, "status": "running"}
    except Exception as e:
        logger.error(f"Error fetching status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
