"""Astronomical target search, coordinate validation, and CDS Sesame resolution."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from ..models.target import (
    CelestialTargetModel,
    CoordinateValidationResult,
    TargetResolveResponse,
    TargetSearchResponse,
)
from ..services.targets import (
    CURATED_TARGETS,
    get_curated_target,
    resolve_target,
    search_curated_targets,
    validate_coordinates,
)

router = APIRouter(prefix="/api/targets", tags=["Astronomical Targets"])


@router.get("/curated", response_model=List[CelestialTargetModel])
async def list_curated_targets():
    """List all preconfigured astronomical benchmark targets (Barnard's Star, WISE 0855, etc.)."""
    return CURATED_TARGETS


@router.get("/search", response_model=TargetSearchResponse)
async def search_targets(
    q: str = Query("", description="Search term for celestial object, designation, or constellation")
):
    """Search astronomical targets by object name, designation, or constellation."""
    results = search_curated_targets(q)
    return TargetSearchResponse(
        ok=True,
        count=len(results),
        targets=results,
    )


@router.get("/resolve", response_model=TargetResolveResponse)
async def resolve_celestial_object(
    q: str = Query(..., description="Target name (e.g. WISE 0855) or coordinate string")
):
    """Resolve an object name via curated catalog, coordinate parser, or CDS Sesame."""
    res = await resolve_target(q)
    if not res.ok:
        raise HTTPException(status_code=404, detail=res.error)
    return res


@router.get("/validate", response_model=CoordinateValidationResult)
async def validate_coords(
    ra: str = Query(..., description="Right Ascension string (HMS or decimal deg)"),
    dec: str = Query(..., description="Declination string (DMS or decimal deg)"),
    fov_arcmin: float = Query(8.0, description="Field of View in arcminutes"),
):
    """Validate RA/Dec coordinate inputs and Field-of-View bounds."""
    result = validate_coordinates(ra, dec, fov_arcmin)
    if not result.is_valid:
        raise HTTPException(status_code=400, detail=result.error)
    return result


@router.get("/{target_id}", response_model=CelestialTargetModel)
async def get_target_by_id(target_id: str):
    """Retrieve full astronomical details for a curated benchmark target."""
    target = get_curated_target(target_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' not found in curated catalog.")
    return target

