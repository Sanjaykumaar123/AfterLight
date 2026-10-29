"""Unit tests for FITS generation, Astropy validation, WCS preservation, and stretching."""
import io
from astropy.io import fits
import numpy as np
import pytest
from app.services.fits_service import (
    apply_astronomical_stretch,
    array_to_preview_image,
    build_fits_file_bytes,
    parse_fits_metadata,
)


def test_build_fits_standards_compliance():
    """Verify generated FITS meets NASA FITS 4.0 standard (2880-byte multiple, headers, WCS)."""
    fits_bytes = build_fits_file_bytes(
        ra_deg=133.795129,
        dec_deg=-7.245147,
        fov_arcmin=8.0,
        epoch_date="2025-09-15",
        band_number=62,
        target_name="WISE_0855",
        width=128,
        height=128,
    )

    # 1. 2880-byte block alignment
    assert len(fits_bytes) % 2880 == 0

    # 2. Astropy FITS inspection
    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        assert len(hdul) >= 1
        header = hdul[0].header
        data = hdul[0].data

        assert header["SIMPLE"] is True
        assert header["BITPIX"] == -32
        assert header["NAXIS"] == 2
        assert header["NAXIS1"] == 128
        assert header["NAXIS2"] == 128
        assert header["CTYPE1"] == "RA---TAN"
        assert header["CTYPE2"] == "DEC--TAN"
        assert header["RADESYS"] == "ICRS"
        assert header["EQUINOX"] == 2000.0
        assert header["CRVAL1"] == pytest.approx(133.795129, abs=1e-5)
        assert header["CRVAL2"] == pytest.approx(-7.245147, abs=1e-5)
        assert header["BANDNUM"] == 62

        assert data.shape == (128, 128)
        assert data.itemsize == 4 and np.issubdtype(data.dtype, np.floating)
        assert np.all(np.isfinite(data))


def test_parse_fits_metadata():
    fits_bytes = build_fits_file_bytes(
        ra_deg=269.452,
        dec_deg=4.693,
        fov_arcmin=8.0,
        epoch_date="2025-09-15",
        band_number=35,
        target_name="Barnard",
    )
    meta = parse_fits_metadata(fits_bytes)
    assert meta.ok
    assert meta.naxis1 == 128
    assert meta.naxis2 == 128
    assert meta.ctype1 == "RA---TAN"
    assert meta.crval1 == pytest.approx(269.452, abs=1e-4)
    assert meta.band_number == 35
    assert meta.max_flux > meta.min_flux


def test_astronomical_stretches():
    data = np.random.normal(0.05, 0.01, (64, 64))
    data[32, 32] = 2.5  # Bright point source

    # Asinh stretch
    stretched_asinh = apply_astronomical_stretch(data, stretch_type="asinh")
    assert stretched_asinh.shape == (64, 64)
    assert np.all(stretched_asinh >= 0.0)
    assert np.all(stretched_asinh <= 1.0)

    # ZScale stretch
    stretched_zscale = apply_astronomical_stretch(data, stretch_type="zscale")
    assert stretched_zscale.shape == (64, 64)
    assert np.all(stretched_zscale >= 0.0)
    assert np.all(stretched_zscale <= 1.0)


def test_preview_image_generation():
    data = np.zeros((64, 64), dtype=np.float32)
    data[32, 32] = 1.0

    # PNG format
    png_bytes = array_to_preview_image(data, wavelength_um=2.2, img_format="PNG")
    assert len(png_bytes) > 0
    assert png_bytes.startswith(b"\x89PNG")

    # JPEG format
    jpg_bytes = array_to_preview_image(data, wavelength_um=4.5, img_format="JPEG")
    assert len(jpg_bytes) > 0
    assert jpg_bytes.startswith(b"\xff\xd8")
