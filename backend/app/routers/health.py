"""Health check and service status router."""
from datetime import datetime, timezone
from fastapi import APIRouter
from ..config import settings

router = APIRouter(prefix="/api", tags=["System & Health"])


@router.get("/health")
async def health_check():
    """Service health status and UTC timestamp."""
    return {
        "ok": True,
        "service": "afterlight-api",
        "status": "operational",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

