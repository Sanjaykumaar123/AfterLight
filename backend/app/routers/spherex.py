"""NASA/SPHEREx mission data integration, IRSA TAP queries, and 102-band metadata."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from ..models.spectrum import (
    SpherexBandModel,
    SpherexDetectorArrayModel,
    SpherexTapResponse,
)
from ..services.spherex import (
    SPHEREX_ARRAYS,
    SPHEREX_BANDS,
    get_spherex_band,
    query_spherex_cutouts,
)

router = APIRouter(prefix="/api/spherex", tags=["NASA SPHEREx Mission Data"])


@router.get("/arrays", response_model=List[SpherexDetectorArrayModel])
async def list_detector_arrays():
    """List the 6 SPHEREx Linear Variable Filter (LVF) detector arrays spanning 0.75-5.00 µm."""
    return SPHEREX_ARRAYS


@router.get("/bands", response_model=List[SpherexBandModel])
async def list_all_spectral_bands():
    """Retrieve metadata for all 102 calibrated SPHEREx spectral channels."""
    return SPHEREX_BANDS


@router.get("/bands/{band_number}", response_model=SpherexBandModel)
async def get_band_details(band_number: int):
    """Retrieve effective wavelength, resolving power, and tracer notes for a single band (1-102)."""
    if band_number < 1 or band_number > 102:
        raise HTTPException(status_code=400, detail="SPHEREx band number must be between 1 and 102.")
    return get_spherex_band(band_number)


@router.get("/cutouts", response_model=SpherexTapResponse)
async def get_spherex_cutouts(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension in decimal degrees"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination in decimal degrees"),
    size_deg: float = Query(0.1, ge=0.01, le=1.0, description="Cutout box size in degrees"),
    bandpass: str = Query("SPHEREx-D2", description="Detector bandpass (SPHEREx-D1 to D6)"),
):
    """Query NASA/IPAC IRSA SPHEREx TAP service for Level-2 Spectral Image cutout metadata."""
    return await query_spherex_cutouts(ra_deg=ra, dec_deg=dec, size_deg=size_deg, bandpass=bandpass)

