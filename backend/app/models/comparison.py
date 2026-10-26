"""Pydantic schemas for Image Comparison and Difference Imaging."""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ComparisonMode(str, Enum):
    SIDE_BY_SIDE = "side-by-side"
    DIFFERENCE = "difference"
    BLINK = "blink"


class DifferenceStats(BaseModel):
    """Statistical summary of signed difference array (Epoch B - Epoch A)."""
    min_diff: float
    max_diff: float
    mean_diff: float
    std_diff: float
    rms_residual: float
    significant_positive_pixels: int
    significant_negative_pixels: int


class ImageComparisonRequest(BaseModel):
    """Parameters for computing multi-epoch image difference and alignment."""
    ra_deg: float
    dec_deg: float
    fov_arcmin: float = 8.0
    band_number: int = 62
    epoch_a_year: float = 2010.21
    epoch_b_year: float = 2025.71
    epoch_a_date: str = "2010-03-18"
    epoch_b_date: str = "2025-09-15"
    target_id: Optional[str] = None
    align_dx: float = 0.0
    align_dy: float = 0.0
    brightness: float = 0.0
    contrast: float = 1.0
    diff_intensity: float = 2.2


class ImageComparisonResponse(BaseModel):
    """Comparison execution result with alignment and difference metrics."""
    ok: bool
    mode: ComparisonMode
    baseline_years: float
    epoch_a_label: str
    epoch_b_label: str
    align_dx: float
    align_dy: float
    diff_stats: DifferenceStats
    preview_url_a: str
    preview_url_b: str
    diff_preview_url: str
    blink_recommended_interval_ms: int = 500

