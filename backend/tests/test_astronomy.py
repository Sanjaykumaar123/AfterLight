"""Unit tests for astronomical coordinate parsing, WCS, and proper motion."""
import math
import pytest
from app.services.astronomy import (
    angular_separation_arcsec,
    clamp_dec_deg,
    create_wcs,
    format_dec_dms,
    format_ra_hms,
    normalize_ra_deg,
    parse_coordinate_pair,
    parse_dec,
    parse_ra,
    pixel_to_wcs,
    position_angle_deg,
    propagate_proper_motion,
    wcs_to_pixel,
)


def test_normalize_and_clamp():
    assert normalize_ra_deg(370.0) == pytest.approx(10.0)
    assert normalize_ra_deg(-10.0) == pytest.approx(350.0)
    assert clamp_dec_deg(95.0) == 90.0
    assert clamp_dec_deg(-100.0) == -90.0
    assert clamp_dec_deg(45.5) == 45.5


def test_parse_ra():
    # Decimal degrees
    assert parse_ra("133.795129") == pytest.approx(133.795129)
    assert parse_ra("0.0") == 0.0

    # HMS format
    # 08h 55m 10.831s = (8 + 55/60 + 10.831/3600) * 15 = 133.795129 deg
    val = parse_ra("08h55m10.831s")
    assert val is not None
    assert val == pytest.approx(133.795129, abs=1e-4)

    # Colon format
    val_colon = parse_ra("08:55:10.831")
    assert val_colon is not None
    assert val_colon == pytest.approx(133.795129, abs=1e-4)

    # Invalid input
    assert parse_ra("invalid_ra") is None
    assert parse_ra("25h 00m 00s") is None


def test_parse_dec():
    # Decimal degrees
    assert parse_dec("-7.245147") == pytest.approx(-7.245147)
    assert parse_dec("+45.0") == 45.0

    # DMS format
    # -07d 14m 42.53s = -(7 + 14/60 + 42.53/3600) = -7.245147 deg
    val = parse_dec("-07d14m42.53s")
    assert val is not None
    assert val == pytest.approx(-7.245147, abs=1e-4)

    # Degree symbol and colons
    val_deg = parse_dec("+04° 41' 36.1\"")
    assert val_deg is not None
    assert val_deg == pytest.approx(4.693361, abs=1e-4)

    # Invalid input
    assert parse_dec("invalid_dec") is None
    assert parse_dec("+95d 00m 00s") is None


def test_parse_coordinate_pair():
    # Comma separated
    res = parse_coordinate_pair("133.795, -7.245")
    assert res is not None
    ra, dec, ra_hms, dec_dms = res
    assert ra == pytest.approx(133.795, abs=1e-3)
    assert dec == pytest.approx(-7.245, abs=1e-3)
    assert "08h" in ra_hms
    assert "-07°" in dec_dms

    # Sexagesimal space separated
    res_sex = parse_coordinate_pair("08h55m10.831s -07d14m42.53s")
    assert res_sex is not None
    assert res_sex[0] == pytest.approx(133.795, abs=1e-3)
    assert res_sex[1] == pytest.approx(-7.245, abs=1e-3)


def test_angular_separation():
    # Same point -> 0 arcsec
    assert angular_separation_arcsec(10.0, 20.0, 10.0, 20.0) == pytest.approx(0.0)

    # 1 degree north along meridian = 3600 arcsec
    sep = angular_separation_arcsec(0.0, 0.0, 0.0, 1.0)
    assert sep == pytest.approx(3600.0, rel=1e-3)


def test_proper_motion_propagation():
    # Barnard's Star: high northward proper motion (+10.36 arcsec/yr)
    ref_ra = 269.452077
    ref_dec = 4.693365
    pm_ra = -801.55  # mas/yr
    pm_dec = 10362.39  # mas/yr

    new_ra, new_dec = propagate_proper_motion(
        ref_ra, ref_dec, pm_ra, pm_dec, 2016.0, 2026.0
    )
    # Over 10 years, Dec increases by ~103.6 arcsec (~0.02877 deg)
    assert new_dec > ref_dec
    assert (new_dec - ref_dec) * 3600.0 == pytest.approx(103.6, abs=0.5)


def test_wcs_invertibility():
    center_ra = 133.795
    center_dec = -7.245
    fov = 8.0
    width = 512
    height = 512

    # Center pixel should map to center coordinate
    ra, dec = pixel_to_wcs(256.0, 256.0, width, height, center_ra, center_dec, fov)
    assert ra == pytest.approx(center_ra, abs=1e-5)
    assert dec == pytest.approx(center_dec, abs=1e-5)

    # Round trip
    test_ra = 133.820
    test_dec = -7.210
    px, py = wcs_to_pixel(test_ra, test_dec, width, height, center_ra, center_dec, fov)
    re_ra, re_dec = pixel_to_wcs(px, py, width, height, center_ra, center_dec, fov)
    assert re_ra == pytest.approx(test_ra, abs=1e-4)
    assert re_dec == pytest.approx(test_dec, abs=1e-4)

