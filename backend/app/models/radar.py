"""Pydantic schemas for the Discovery Radar moving-object detection engine."""
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ReviewStatus(str, Enum):
    PENDING_REVIEW = "Pending Review"
    UNDER_INSPECTION = "Under Inspection"
    MATCHED_KNOWN_OBJECT = "Matched Known Object"
    REJECTED = "Rejected (Artifact/Noise)"


class DetectedSourceModel(BaseModel):
    """Point source extracted by Photutils/centroiding."""
    id: str
    x: float
    y: float
    peak_flux: float
    integrated_flux: float
    snr: float
    ra_deg: float
    dec_deg: float


class MovingCandidateModel(BaseModel):
    """Ranked moving object candidate identified between two observation epochs."""
    candidate_id: str
    ra_deg: float
    dec_deg: float
    ra_hms: str
    dec_dms: str
    epoch_a_date: str
    epoch_b_date: str
    displacement_arcsec: float
    displacement_px: float
    proper_motion_arcsec_yr: float
    position_angle_deg: float
    snr_epoch_a: float
    snr_epoch_b: float
    confidence: float
    review_status: ReviewStatus = ReviewStatus.PENDING_REVIEW
    epoch_a_pos: Dict[str, float]
    epoch_b_pos: Dict[str, float]
    classification_note: str
    scientific_disclaimer: str = (
        "CANDIDATE DISCOVERY - UNCONFIRMED. Requires independent astrometric validation "
        "and follow-up catalog cross-matching. Not a confirmed astronomical discovery."
    )


class RadarDetectionRequest(BaseModel):
    """Parameters for running the Photutils/astrometric candidate detection pipeline."""
    ra_deg: float
    dec_deg: float
    fov_arcmin: float = 8.0
    band_number: int = 62
    epoch_a_year: float = 2010.21
    epoch_b_year: float = 2025.71
    epoch_a_date: str = "2010-03-18"
    epoch_b_date: str = "2025-09-15"
    target_id: Optional[str] = None
    snr_threshold: float = 5.5
    matching_radius_arcsec: float = 1.2
    include_synthetic_mover: bool = False


class RadarDetectionResponse(BaseModel):
    """Astrometric source cross-match and moving candidate ranking results."""
    ok: bool
    epoch_a_source_count: int
    epoch_b_source_count: int
    matched_static_count: int
    astrometric_rms_arcsec: float
    candidate_count: int
    candidates: List[MovingCandidateModel]
    scientific_disclaimer: str


class CandidateUpdateRequest(BaseModel):
    """Update review status or notes for a candidate."""
    review_status: ReviewStatus
    notes: Optional[str] = None

