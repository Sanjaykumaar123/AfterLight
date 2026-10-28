"""FITS image retrieval, astronomical stretching, WCS extraction, and FITS file export."""
import re
from fastapi import APIRouter, HTTPException, Query, Response
from ..models.fits import FitsMetadataResponse
from ..services.fits_service import (
    array_to_preview_image,
    build_fits_file_bytes,
    fetch_archive_cutout,
    parse_fits_metadata,
)
from ..services.sky_generator import render_simulated_field
from ..services.spherex import get_spherex_band
from ..services.targets import get_curated_target

router = APIRouter(prefix="/api/fits", tags=["FITS Image Processing"])


@router.get("/cutout")
async def get_archival_or_simulated_cutout(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=120.0, description="Field of View in arcminutes"),
    survey: str = Query("CDS/P/allWISE/color", description="Archival survey layer"),
):
    """Retrieve archival sky cutout from CDS HiPS2FITS with fallback to calibrated simulation."""
    img_bytes, content_type, data_mode = await fetch_archive_cutout(
        ra_deg=ra, dec_deg=dec, fov_arcmin=fov, survey=survey
    )
    if img_bytes is None:
        raise HTTPException(status_code=503, detail="Unable to generate or retrieve sky cutout.")

    headers = {
        "Content-Type": content_type,
        "X-Data-Mode": data_mode,
        "Cache-Control": "public, max-age=300",
    }
    return Response(content=img_bytes, media_type=content_type, headers=headers)


@router.get("/preview")
async def get_stretched_preview(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=60.0),
    band: int = Query(62, ge=1, le=102),
    epoch_year: float = Query(2025.71),
    stretch: str = Query("asinh", description="Astronomical stretch: asinh, zscale, log, linear"),
    contrast: float = Query(1.0),
    brightness: float = Query(0.0),
    target_id: str = Query(None),
):
    """Generate stretched, false-color browser-compatible preview from 2D astronomical array."""
    target = get_curated_target(target_id) if target_id else None
    spx_band = get_spherex_band(band)

    buffer = render_simulated_field(
        center_ra_deg=ra,
        center_dec_deg=dec,
        fov_arcmin=fov,
        epoch_year=epoch_year,
        band_number=band,
        target=target,
        include_synthetic_mover=(target is None),
        width=512,
        height=512,
    )

    img_bytes = array_to_preview_image(
        buffer,
        wavelength_um=spx_band.wavelength_um,
        stretch_type=stretch,
        contrast=contrast,
        brightness=brightness,
        img_format="PNG",
    )
    return Response(content=img_bytes, media_type="image/png")


@router.get("/metadata", response_model=FitsMetadataResponse)
async def get_fits_plate_metadata(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=60.0),
    band: int = Query(62, ge=1, le=102),
    epoch: str = Query("2025-09-15"),
    target_name: str = Query("AFTERLIGHT_FIELD"),
):
    """Inspect full scientific FITS header cards, WCS solution, and pixel statistics."""
    fits_bytes = build_fits_file_bytes(
        ra_deg=ra,
        dec_deg=dec,
        fov_arcmin=fov,
        epoch_date=epoch,
        band_number=band,
        target_name=target_name,
    )
    return parse_fits_metadata(fits_bytes, filename=f"afterlight_{target_name}_band{band}.fits")


@router.get("/export")
async def export_fits_product(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    fov: float = Query(8.0, ge=1.0, le=60.0),
    epoch: str = Query("2025-09-15"),
    band: int = Query(62, ge=1, le=102),
    target_name: str = Query("AFTERLIGHT_FIELD"),
):
    """Download standards-aligned 2880-byte padded FITS product with standard WCS."""
    fits_bytes = build_fits_file_bytes(
        ra_deg=ra,
        dec_deg=dec,
        fov_arcmin=fov,
        epoch_date=epoch,
        band_number=band,
        target_name=target_name,
    )
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]+", "_", target_name).lower()
    filename = f"afterlight_{safe_name}_band{band}.fits"

    return Response(
        content=fits_bytes,
        media_type="application/fits",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

