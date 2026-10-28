"""AFTERLIGHT Scientific Backend Application Entry Point.

Designed for the NASA Space Apps Challenge 2026.
"""
from contextlib import asynccontextmanager
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import (
    archive_compat,
    comparison,
    fits,
    health,
    radar,
    sources,
    spectrum,
    spherex,
    targets,
    timeline,
)
from .services.database import init_db

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("afterlight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan events."""
    logger.info("Initializing AFTERLIGHT database at %s", settings.DATABASE_PATH)
    init_db()
    logger.info("AFTERLIGHT Scientific Backend v%s started.", settings.APP_VERSION)
    yield
    logger.info("AFTERLIGHT Scientific Backend shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-oriented scientific astronomical backend for AFTERLIGHT — "
        "NASA Space Apps Challenge 2026.\n\n"
        "Integrates NASA/IPAC IRSA SPHEREx datasets, FITS processing via Astropy, "
        "proper-motion and time-series propagation, dual-epoch image comparison, "
        "102-band spectrophotometric exploration, and Discovery Radar point-source extraction via Photutils."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Cross-Origin Resource Sharing (CORS) configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular API routers
app.include_router(health.router)
app.include_router(targets.router)
app.include_router(spherex.router)
app.include_router(fits.router)
app.include_router(timeline.router)
app.include_router(comparison.router)
app.include_router(spectrum.router)
app.include_router(radar.router)
app.include_router(sources.router)
app.include_router(archive_compat.router)


# Mount static image assets
dist_dir = settings.BASE_DIR.parent / "dist"
images_dir = settings.BASE_DIR.parent / "src" / "assets" / "images"

if images_dir.is_dir():
    app.mount("/src/assets/images", StaticFiles(directory=images_dir), name="images")

if dist_dir.is_dir():
    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/", tags=["Root"])
async def root_index(request: Request):
    """Root endpoint: serves frontend React application for web browsers, or API metadata for JSON clients."""
    accept = request.headers.get("accept", "")
    index_file = dist_dir / "index.html"
    if "text/html" in accept and index_file.is_file():
        return FileResponse(index_file)

    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "interactive_docs": "/docs",
        "redoc": "/redoc",
        "health_check": "/api/health",
        "mission_focus": "NASA SPHEREx All-Sky Spectral Survey (0.75 - 5.00 µm, 102 bands)",
        "verified_archives": ["NASA/IPAC IRSA", "CDS Strasbourg", "ESA Gaia DR3"],
    }


@app.get("/{full_path:path}", include_in_schema=False)
async def catch_all_spa(full_path: str):
    """Fallback catch-all route for SPA client-side routing."""
    target_file = dist_dir / full_path
    if target_file.is_file():
        return FileResponse(target_file)
    index_file = dist_dir / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"detail": f"Path '{full_path}' not found."})

