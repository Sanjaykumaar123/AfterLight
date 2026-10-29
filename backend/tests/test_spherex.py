"""Unit tests for SPHEREx 102 spectral channels, detector arrays, and TAP ADQL."""
import pytest
from app.services.spherex import (
    SPHEREX_ARRAYS,
    SPHEREX_BANDS,
    build_spherex_tap_adql,
    get_spherex_band,
    is_near_m101,
)


def test_spherex_arrays_count():
    assert len(SPHEREX_ARRAYS) == 6
    assert SPHEREX_ARRAYS[0].min_um == 0.75
    assert SPHEREX_ARRAYS[-1].max_um == 5.00


def test_spherex_102_bands():
    assert len(SPHEREX_BANDS) == 102

    # Check numbering from 1 to 102
    assert SPHEREX_BANDS[0].band_number == 1
    assert SPHEREX_BANDS[-1].band_number == 102

    # Check wavelength monotonicity within arrays
    for i in range(len(SPHEREX_BANDS) - 1):
        if SPHEREX_BANDS[i].array_id == SPHEREX_BANDS[i + 1].array_id:
            assert SPHEREX_BANDS[i].wavelength_um < SPHEREX_BANDS[i + 1].wavelength_um

    # Spot check array resolving powers
    band_arr1 = get_spherex_band(10)
    assert band_arr1.array_id == 1
    assert band_arr1.resolving_power == 41

    band_arr5 = get_spherex_band(75)
    assert band_arr5.array_id == 5
    assert band_arr5.resolving_power == 110

    band_arr6 = get_spherex_band(95)
    assert band_arr6.array_id == 6
    assert band_arr6.resolving_power == 130


def test_spherex_tap_adql_builder():
    adql = build_spherex_tap_adql(210.80227, 54.34895, 0.1, "SPHEREx-D2")
    assert "spherex.artifact" in adql
    assert "spherex.plane" in adql
    assert "210.80227" in adql
    assert "54.34895" in adql
    assert "SPHEREx-D2" in adql


def test_near_m101_check():
    assert is_near_m101(210.80, 54.35)
    assert not is_near_m101(133.79, -7.24)

