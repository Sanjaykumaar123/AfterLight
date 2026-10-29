"""Unit tests for 102-band SED computation and spectral energy modeling."""
import pytest
from app.services.spectrum_service import compute_spectral_energy_distribution


def test_y_dwarf_spectral_profile():
    """Verify Y-type brown dwarf (WISE 0855) peaks in SPHEREx Array 6 (4.4-5.0 um)."""
    sed = compute_spectral_energy_distribution(profile="y-dwarf", scale_flux_mjy=3.4, target_name="WISE 0855")
    assert sed.ok
    assert len(sed.points) == 102
    assert max(p.flux_mjy for p in sed.points) == pytest.approx(3.4, abs=0.1)

    # Flux in Array 1 (0.75-1.11 um) should be vastly fainter than Array 6 (4.4-5.0 um)
    flux_arr1 = sed.points[5].flux_mjy
    flux_arr6 = sed.points[95].flux_mjy
    assert flux_arr6 > (flux_arr1 * 3.0)


def test_t_dwarf_spectral_profile():
    """Verify T-type brown dwarf features methane absorption."""
    sed = compute_spectral_energy_distribution(profile="t-dwarf", scale_flux_mjy=85.0, target_name="Epsilon Indi B")
    assert sed.ok
    assert len(sed.points) == 102
    assert any("CH4" in f for f in sed.molecular_features)


def test_t_tauri_dust_profile():
    sed = compute_spectral_energy_distribution(profile="t-tauri-dust", scale_flux_mjy=380.0, target_name="RW Aurigae")
    assert sed.ok
    assert any("dust" in f.lower() for f in sed.molecular_features)

