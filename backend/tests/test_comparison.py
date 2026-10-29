"""Unit tests for Image Comparison and Difference Imaging."""
import pytest
from app.models.comparison import ImageComparisonRequest
from app.services.comparison_service import perform_image_comparison


def test_image_comparison_diff_and_stats():
    req = ImageComparisonRequest(
        ra_deg=269.452077,
        dec_deg=4.693365,
        fov_arcmin=8.0,
        band_number=62,
        epoch_a_year=2010.21,
        epoch_b_year=2025.71,
        target_id="barnards-star",
    )
    res = perform_image_comparison(req, width=128, height=128)
    assert res.ok
    assert res.baseline_years == pytest.approx(15.5, abs=0.1)
    assert res.diff_stats.rms_residual > 0.0
    assert "data:image/png;base64," in res.preview_url_a
    assert "data:image/png;base64," in res.preview_url_b
    assert "data:image/png;base64," in res.diff_preview_url


def test_image_comparison_alignment_shift():
    req_shifted = ImageComparisonRequest(
        ra_deg=133.795,
        dec_deg=-7.245,
        fov_arcmin=8.0,
        band_number=92,
        epoch_a_year=2010.34,
        epoch_b_year=2025.86,
        align_dx=2.5,
        align_dy=-1.5,
    )
    res = perform_image_comparison(req_shifted, width=128, height=128)
    assert res.ok
    assert res.align_dx == 2.5
    assert res.align_dy == -1.5

