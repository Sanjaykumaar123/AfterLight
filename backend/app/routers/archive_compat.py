"""Backward-compatibility router for existing frontend /api/archive/* endpoints.

Preserves exact response schemas, status codes, and query parameters expected by React.
"""
import re
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from ..services.fits_service import build_fits_file_bytes, fetch_archive_cutout
from ..services.spectrum_service import query_irsa_allwise_catalog
from ..services.spherex import query_spherex_cutouts
from ..services.targets import resolve_target

router = APIRouter(prefix="/api/archive", tags=["Frontend Backward-Compatibility Archive Endpoints"])


@router.get("/resolve")
async def archive_resolve_endpoint(
    q: str = Query("", description="Object designation or coordinate pair")
):
    """Resolve celestial target or coordinates with exact frontend-compatible JSON response."""
    query = q.strip()
    if not query:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Missing query parameter q"},
        )

    res = await resolve_target(query)
    if not res.ok:
        return JSONResponse(
            status_code=404,
            content={
                "ok": False,
                "dataMode": "demonstration",
                "error": res.error
                or f'Could not resolve "{query}". Select a preconfigured target or enter J2000 coordinates.',
            },
        )

    return {
        "ok": True,
        "source": res.source,
        "dataMode": res.data_mode,
        "name": res.name,
        "objectType": res.object_type,
        "raDeg": res.ra_deg,
        "decDeg": res.dec_deg,
        "raHms": res.ra_hms,
        "decDms": res.dec_dms,
        # Also snake_case for Python API consumers
        "ra_deg": res.ra_deg,
        "dec_deg": res.dec_deg,
        "ra_hms": res.ra_hms,
        "dec_dms": res.dec_dms,
    }


@router.get("/cutout")
async def archive_cutout_endpoint(
    ra: float = Query(...),
    dec: float = Query(...),
    fov: float = Query(8.0),
    survey: str = Query("CDS/P/allWISE/color"),
):
    """Fetch live or simulated sky cutout preview matching frontend image expectations."""
    img_bytes, content_type, data_mode = await fetch_archive_cutout(
        ra_deg=ra, dec_deg=dec, fov_arcmin=fov, survey=survey
    )
    if img_bytes is None:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "dataMode": "demonstration",
                "message": "Live HiPS2FITS archival service unavailable; using calibrated demonstration sky field.",
            },
        )

    headers = {
        "Content-Type": content_type,
        "X-Data-Mode": data_mode,
        "Cache-Control": "public, max-age=300",
    }
    return Response(content=img_bytes, media_type=content_type, headers=headers)


@router.get("/irsa-catalog")
async def archive_irsa_catalog_endpoint(
    ra: float = Query(...),
    dec: float = Query(...),
    radiusArcsec: float = Query(120.0),
):
    """Query NASA/IPAC IRSA TAP AllWISE sources matching frontend query parameters."""
    result = await query_irsa_allwise_catalog(ra_deg=ra, dec_deg=dec, radius_arcsec=radiusArcsec)
    return {
        "ok": result.get("ok", True),
        "dataMode": result.get("data_mode", "live-archive"),
        "source": result.get("source", "NASA/IPAC IRSA AllWISE TAP"),
        "rows": result.get("rows", []),
    }


@router.get("/spherex-cutouts")
async def archive_spherex_cutouts_endpoint(
    ra: float = Query(...),
    dec: float = Query(...),
    sizeDeg: float = Query(0.1),
    bandpass: str = Query("SPHEREx-D2"),
):
    """Query SPHEREx Level-2 cutout metadata matching frontend query parameters."""
    tap_resp = await query_spherex_cutouts(
        ra_deg=ra, dec_deg=dec, size_deg=sizeDeg, bandpass=bandpass
    )
    return {
        "ok": tap_resp.ok,
        "dataMode": tap_resp.data_mode,
        "source": tap_resp.source,
        "adql": tap_resp.adql,
        "rows": tap_resp.rows,
    }


@router.get("/fits-export")
async def archive_fits_export_endpoint(
    ra: float = Query(...),
    dec: float = Query(...),
    fov: float = Query(8.0),
    epoch: str = Query("2025-09-15"),
    band: int = Query(62),
    targetName: str = Query("AFTERLIGHT_FIELD"),
):
    """Download standard FITS file with identical parameters to existing frontend download link."""
    fits_bytes = build_fits_file_bytes(
        ra_deg=ra,
        dec_deg=dec,
        fov_arcmin=fov,
        epoch_date=epoch,
        band_number=band,
        target_name=targetName,
    )
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]+", "_", targetName).lower()
    filename = f"afterlight_{safe_name}_band{band}.fits"

    return Response(
        content=fits_bytes,
        media_type="application/fits",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

