"""Image Comparison Router: Side-by-side, difference imaging, and blink comparison."""
from fastapi import APIRouter, Query, Response
from ..models.comparison import (
    ImageComparisonRequest,
    ImageComparisonResponse,
)
from ..services.comparison_service import perform_image_comparison

router = APIRouter(prefix="/api/comparison", tags=["Image Comparison Engine"])


@router.post("/diff", response_model=ImageComparisonResponse)
async def compute_image_difference(req: ImageComparisonRequest):
    """Compute dual-epoch astrometric alignment, signed difference matrix, and preview data."""
    return perform_image_comparison(req)


@router.get("/preview")
async def get_comparison_diff_preview(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=60.0),
    band: int = Query(62, ge=1, le=102),
    epoch_a: float = Query(2010.21),
    epoch_b: float = Query(2025.71),
    align_dx: float = Query(0.0),
    align_dy: float = Query(0.0),
    diff_intensity: float = Query(2.2),
    target_id: str = Query(None),
):
    """Convenience GET endpoint to obtain dual-epoch difference comparison metrics and previews."""
    req = ImageComparisonRequest(
        ra_deg=ra,
        dec_deg=dec,
        fov_arcmin=fov,
        band_number=band,
        epoch_a_year=epoch_a,
        epoch_b_year=epoch_b,
        align_dx=align_dx,
        align_dy=align_dy,
        diff_intensity=diff_intensity,
        target_id=target_id,
    )
    return perform_image_comparison(req)

