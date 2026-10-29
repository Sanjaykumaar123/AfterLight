"""Unit tests for Discovery Radar moving-object detection and ranking using Photutils."""
import pytest
from app.models.radar import RadarDetectionRequest, ReviewStatus
from app.services.radar_service import run_discovery_radar


def test_radar_detection_on_moving_benchmark():
    """Verify Discovery Radar detects moving object benchmark (Barnard's Star)."""
    req = RadarDetectionRequest(
        ra_deg=269.452077,
        dec_deg=4.693365,
        fov_arcmin=8.0,
        band_number=62,
        epoch_a_year=2010.21,
        epoch_b_year=2025.71,
        epoch_a_date="2010-03-18",
        epoch_b_date="2025-09-15",
        target_id="barnards-star",
        snr_threshold=4.5,
    )
    res = run_discovery_radar(req, width=128, height=128)
    assert res.ok
    assert res.epoch_a_source_count > 0
    assert res.epoch_b_source_count > 0
    assert res.candidate_count >= 1

    top_cand = res.candidates[0]
    assert top_cand.displacement_arcsec > 0.0
    assert top_cand.proper_motion_arcsec_yr > 0.0
    assert top_cand.confidence > 0.5
    assert "UNCONFIRMED" in top_cand.scientific_disclaimer


def test_radar_static_field():
    """Verify Discovery Radar identifies high static match rate on zero-motion field."""
    req = RadarDetectionRequest(
        ra_deg=197.145833,
        dec_deg=29.366667,
        fov_arcmin=8.0,
        band_number=46,
        epoch_a_year=2025.0,
        epoch_b_year=2025.1,
        target_id="sa-57",
        snr_threshold=5.0,
    )
    res = run_discovery_radar(req, width=128, height=128)
    assert res.ok
    assert res.matched_static_count > 0
    assert res.astrometric_rms_arcsec < 0.5

