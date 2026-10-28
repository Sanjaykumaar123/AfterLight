"""Infrared Wavelength Explorer: 102-band SPHEREx SED modeling and IRSA AllWISE catalog queries."""
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query
from ..models.spectrum import SedResponse, SpherexBandModel
from ..services.spectrum_service import (
    compute_spectral_energy_distribution,
    query_irsa_allwise_catalog,
)
from ..services.spherex import SPHEREX_BANDS, get_spherex_band
from ..services.targets import get_curated_target

router = APIRouter(prefix="/api/spectrum", tags=["Infrared Wavelength Explorer"])


@router.get("/bands", response_model=List[SpherexBandModel])
async def list_spectral_bands():
    """List all 102 calibrated SPHEREx spectral channels (0.75 - 5.00 µm)."""
    return SPHEREX_BANDS


@router.get("/bands/{band_number}", response_model=SpherexBandModel)
async def get_band_info(band_number: int):
    """Retrieve details for a single SPHEREx spectral band."""
    if band_number < 1 or band_number > 102:
        raise HTTPException(status_code=400, detail="Band number must be between 1 and 102.")
    return get_spherex_band(band_number)


@router.get("/irsa-allwise")
async def get_irsa_allwise_sources(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    radius_arcsec: float = Query(120.0, ge=10.0, le=600.0),
):
    """Query NASA/IPAC IRSA AllWISE source photometry within cone radius."""
    return await query_irsa_allwise_catalog(ra_deg=ra, dec_deg=dec, radius_arcsec=radius_arcsec)


@router.get("/{target_id}", response_model=SedResponse)
async def get_target_sed(target_id: str):
    """Retrieve 102-band spectrophotometric SED curve for a curated astronomical target."""
    target = get_curated_target(target_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' not found.")

    return compute_spectral_energy_distribution(
        profile=target.spectral_profile,
        scale_flux_mjy=target.scale_flux_mjy,
        target_name=target.name,
    )


@router.post("/sed", response_model=SedResponse)
async def compute_custom_sed(
    profile: str = Query("field-star", description="Spectral profile kind (m-dwarf, t-dwarf, y-dwarf, t-tauri-dust, mira-giant, field-star)"),
    scale_flux_mjy: float = Query(25.0, ge=0.01, le=100000.0),
    target_name: str = Query("Custom Object"),
):
    """Compute physical 102-band SED curve for arbitrary spectral profile and flux."""
    return compute_spectral_energy_distribution(
        profile=profile,
        scale_flux_mjy=scale_flux_mjy,
        target_name=target_name,
    )

