"""Discovery Radar: Automated moving-object candidate detection and review management."""
from fastapi import APIRouter, HTTPException, Query
from ..models.radar import (
    CandidateUpdateRequest,
    RadarDetectionRequest,
    RadarDetectionResponse,
    ReviewStatus,
)
from ..services.database import get_candidate_reviews, save_candidate_review
from ..services.radar_service import run_discovery_radar

router = APIRouter(prefix="/api/radar", tags=["Discovery Radar"])


@router.post("/detect", response_model=RadarDetectionResponse)
async def detect_moving_candidates(req: RadarDetectionRequest):
    """Run Photutils point-source detection, astrometric cross-matching, and candidate ranking."""
    return run_discovery_radar(req)


@router.get("/candidates", response_model=RadarDetectionResponse)
async def get_candidates(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=60.0),
    band: int = Query(62, ge=1, le=102),
    epoch_a_year: float = Query(2010.21),
    epoch_b_year: float = Query(2025.71),
    epoch_a_date: str = Query("2010-03-18"),
    epoch_b_date: str = Query("2025-09-15"),
    target_id: str = Query(None),
    snr: float = Query(5.5, ge=3.0, le=20.0),
):
    """Convenience GET endpoint to run radar detection and retrieve ranked candidates."""
    req = RadarDetectionRequest(
        ra_deg=ra,
        dec_deg=dec,
        fov_arcmin=fov,
        band_number=band,
        epoch_a_year=epoch_a_year,
        epoch_b_year=epoch_b_year,
        epoch_a_date=epoch_a_date,
        epoch_b_date=epoch_b_date,
        target_id=target_id,
        snr_threshold=snr,
    )
    return run_discovery_radar(req)


@router.patch("/candidates/{candidate_id}")
async def update_candidate_review_status(candidate_id: str, update: CandidateUpdateRequest):
    """Update human inspection review status and notes in persistent SQLite store."""
    save_candidate_review(
        candidate_id=candidate_id,
        review_status=update.review_status.value,
        notes=update.notes,
    )
    return {
        "ok": True,
        "candidate_id": candidate_id,
        "review_status": update.review_status,
        "notes": update.notes,
        "message": f"Candidate {candidate_id} status updated to {update.review_status.value}.",
    }

