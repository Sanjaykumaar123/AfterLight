"""Unit tests for curated targets, searching, and coordinate validation."""
import pytest
from app.services.targets import (
    CURATED_TARGETS,
    get_curated_target,
    resolve_target,
    search_curated_targets,
    validate_coordinates,
)


def test_curated_targets_presence():
    """Verify all 5 required benchmark targets and calibration fields are present."""
    ids = {t.id for t in CURATED_TARGETS}
    required = {
        "barnards-star",
        "epsilon-indi-b",
        "wise-0855",
        "rw-aurigae",
        "r-draconis",
        "sa-57",
    }
    assert required.issubset(ids)


def test_target_details():
    barnard = get_curated_target("barnards-star")
    assert barnard is not None
    assert barnard.name == "Barnard's Star"
    assert barnard.total_proper_motion_arcsec_yr > 10.0
    assert len(barnard.epochs) >= 4

    wise0855 = get_curated_target("wise-0855")
    assert wise0855 is not None
    assert wise0855.category == "Y-Type Brown Dwarf"
    assert wise0855.spectral_profile == "y-dwarf"


def test_target_search():
    res = search_curated_targets("WISE")
    assert len(res) >= 1
    assert any(t.id == "wise-0855" for t in res)

    res_mira = search_curated_targets("Mira")
    assert len(res_mira) >= 1
    assert any(t.id == "r-draconis" for t in res_mira)


@pytest.mark.asyncio
async def test_resolve_curated_and_coords():
    # Curated name
    res_b = await resolve_target("Barnard's Star")
    assert res_b.ok
    assert res_b.source == "curated-catalog"
    assert res_b.ra_deg == pytest.approx(269.452077, abs=1e-4)

    # Coordinate pair
    res_c = await resolve_target("08h55m10.831s, -07d14m42.53s")
    assert res_c.ok
    assert res_c.source == "coordinate-parse"
    assert res_c.ra_deg == pytest.approx(133.795129, abs=1e-4)


def test_coordinate_validation():
    valid = validate_coordinates("133.795", "-7.245", 8.0)
    assert valid.is_valid
    assert valid.error is None

    invalid = validate_coordinates("invalid_coord", "0.0", 8.0)
    assert not invalid.is_valid
    assert "Invalid RA or Dec" in invalid.error
