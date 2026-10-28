"""Image Comparison Engine: Alignment, Difference Imaging, and Blink Comparison."""
import base64
from typing import Dict, Optional, Tuple
import numpy as np
from scipy.ndimage import shift as nd_shift
from ..models.comparison import (
    ComparisonMode,
    DifferenceStats,
    ImageComparisonRequest,
    ImageComparisonResponse,
)
from .fits_service import array_to_preview_image
from .sky_generator import render_simulated_field
from .spherex import get_spherex_band
from .targets import get_curated_target


def perform_image_comparison(
    req: ImageComparisonRequest,
    width: int = 384,
    height: int = 384,
) -> ImageComparisonResponse:
    """Execute dual-epoch image comparison, subpixel alignment, and difference calculation."""
    target = get_curated_target(req.target_id) if req.target_id else None
    band = get_spherex_band(req.band_number)

    # 1. Render Epoch A
    buffer_a = render_simulated_field(
        center_ra_deg=req.ra_deg,
        center_dec_deg=req.dec_deg,
        fov_arcmin=req.fov_arcmin,
        epoch_year=req.epoch_a_year,
        band_number=req.band_number,
        target=target,
        include_synthetic_mover=(target is None),
        width=width,
        height=height,
    )

    # 2. Render Epoch B
    buffer_b = render_simulated_field(
        center_ra_deg=req.ra_deg,
        center_dec_deg=req.dec_deg,
        fov_arcmin=req.fov_arcmin,
        epoch_year=req.epoch_b_year,
        band_number=req.band_number,
        target=target,
        include_synthetic_mover=(target is None),
        width=width,
        height=height,
    )

    # 3. Apply Astrometric Alignment Shift to Epoch B if requested
    if abs(req.align_dx) > 1e-4 or abs(req.align_dy) > 1e-4:
        aligned_b = nd_shift(buffer_b, shift=(req.align_dy, req.align_dx), mode="nearest")
    else:
        aligned_b = buffer_b

    # 4. Compute Signed Difference Image: Diff = Epoch B - Epoch A
    diff = aligned_b - buffer_a

    # 5. Compute Scientific Difference Metrics
    mean_val = float(np.mean(diff))
    std_val = float(np.std(diff))
    rms_residual = float(np.sqrt(np.mean(diff ** 2)))
    threshold = 3.5 * max(std_val, 1e-4)

    pos_pixels = int(np.sum(diff > threshold))
    neg_pixels = int(np.sum(diff < -threshold))

    diff_stats = DifferenceStats(
        min_diff=round(float(np.min(diff)), 4),
        max_diff=round(float(np.max(diff)), 4),
        mean_diff=round(mean_val, 5),
        std_diff=round(std_val, 5),
        rms_residual=round(rms_residual, 5),
        significant_positive_pixels=pos_pixels,
        significant_negative_pixels=neg_pixels,
    )

    # 6. Render Previews into base64 Data URIs
    preview_bytes_a = array_to_preview_image(
        buffer_a,
        wavelength_um=band.wavelength_um,
        stretch_type="asinh",
        brightness=req.brightness,
        contrast=req.contrast,
    )
    preview_bytes_b = array_to_preview_image(
        aligned_b,
        wavelength_um=band.wavelength_um,
        stretch_type="asinh",
        brightness=req.brightness,
        contrast=req.contrast,
    )
    diff_preview_bytes = array_to_preview_image(
        diff,
        is_difference=True,
        diff_intensity=req.diff_intensity,
    )

    data_url_a = f"data:image/png;base64,{base64.b64encode(preview_bytes_a).decode('ascii')}"
    data_url_b = f"data:image/png;base64,{base64.b64encode(preview_bytes_b).decode('ascii')}"
    diff_data_url = f"data:image/png;base64,{base64.b64encode(diff_preview_bytes).decode('ascii')}"

    baseline = abs(req.epoch_b_year - req.epoch_a_year)

    return ImageComparisonResponse(
        ok=True,
        mode=ComparisonMode.SIDE_BY_SIDE,
        baseline_years=round(baseline, 2),
        epoch_a_label=f"{req.epoch_a_date} ({req.epoch_a_year:.2f})",
        epoch_b_label=f"{req.epoch_b_date} ({req.epoch_b_year:.2f})",
        align_dx=req.align_dx,
        align_dy=req.align_dy,
        diff_stats=diff_stats,
        preview_url_a=data_url_a,
        preview_url_b=data_url_b,
        diff_preview_url=diff_data_url,
        blink_recommended_interval_ms=500,
    )

