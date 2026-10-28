"""Cosmic Time Machine: Multi-epoch observation timeline and proper motion propagation."""
from typing import List
from fastapi import APIRouter, HTTPException
from ..models.observation import (
    PropagateCoordinatesRequest,
    PropagateCoordinatesResponse,
    TimelineResponse,
)
from ..models.target import ObservationEpochModel
from ..services.timeline_service import (
    compute_epoch_propagation,
    get_target_timeline,
)

router = APIRouter(prefix="/api/timeline", tags=["Cosmic Time Machine"])

DEFAULT_BENCHMARK_EPOCHS: List[ObservationEpochModel] = [
    ObservationEpochModel(
        id="custom-2010",
        date_iso="2010-05-12",
        year_decimal=2010.36,
        instrument="WISE Cryogenic Survey",
        wavelength_label="3.4 µm (W1)",
        band_number=62,
        flux_multiplier=1.0,
        data_provenance="Archival Survey Reference",
        notes="Archival WISE baseline sky coordinates.",
    ),
    ObservationEpochModel(
        id="custom-2017",
        date_iso="2017-05-15",
        year_decimal=2017.37,
        instrument="NEOWISE Reactivation",
        wavelength_label="4.6 µm (W2)",
        band_number=90,
        flux_multiplier=1.0,
        data_provenance="Archival Survey Reference",
        notes="Mid-baseline reactivation pass.",
    ),
    ObservationEpochModel(
        id="custom-2025",
        date_iso="2025-05-20",
        year_decimal=2025.38,
        instrument="SPHEREx All-Sky Survey (Simulated)",
        wavelength_label="2.20 µm (Array 3)",
        band_number=46,
        flux_multiplier=1.0,
        data_provenance="Simulated SPHEREx Epoch",
        notes="Simulated multi-band SPHEREx pass.",
    ),
]


@router.get("/epochs", response_model=List[ObservationEpochModel])
async def list_standard_epochs():
    """Retrieve standard benchmark epochs across WISE, NEOWISE, and SPHEREx."""
    return DEFAULT_BENCHMARK_EPOCHS


@router.get("/{target_id}", response_model=TimelineResponse)
async def get_timeline_for_target(target_id: str):
    """Retrieve chronologically sorted observation timeline for a target."""
    timeline = get_target_timeline(target_id)
    if not timeline:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' timeline not found.")
    return timeline


@router.post("/propagate", response_model=PropagateCoordinatesResponse)
async def propagate_proper_motion_epochs(req: PropagateCoordinatesRequest):
    """Calculate target celestial positions across requested epoch baselines."""
    return compute_epoch_propagation(req)

