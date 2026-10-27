"""Calibrated astronomical sky field simulator for multi-epoch observation plates.

Generates reproducible point sources, background galaxies, PSF wings, target proper motion,
and sky background noise.
"""
import math
from typing import Dict, List, Optional
import numpy as np
from ..models.target import CelestialTargetModel
from .astronomy import propagate_proper_motion, wcs_to_pixel
from .spherex import get_spherex_band


def seed_from_coords(ra_deg: float, dec_deg: float) -> int:
    """Generate reproducible 32-bit integer seed from celestial coordinates."""
    r = int(round(ra_deg * 100))
    d = int(round((dec_deg + 90.0) * 100))
    return int(((r * 73856093) ^ (d * 19349663)) & 0xFFFFFFFF)


def target_spectral_response(profile: str, wavelength_um: float) -> float:
    """Compute relative flux response across infrared wavelength channels."""
    if profile == "y-dwarf":
        if wavelength_um < 1.8:
            return 0.04
        if wavelength_um < 3.0:
            return 0.14
        if wavelength_um < 4.0:
            return 0.42
        return 0.78 + ((wavelength_um - 4.0) / 1.0) * 0.45
    elif profile == "t-dwarf":
        ch4 = 1.0 - 0.45 * math.exp(-(((wavelength_um - 3.3) / 0.25) ** 2))
        return (0.55 + 0.12 * wavelength_um) * ch4
    elif profile == "t-tauri-dust":
        return 0.70 + 0.22 * wavelength_um
    elif profile == "mira-giant":
        return 1.15 - 0.06 * wavelength_um
    else:
        # Default stellar blackbody-like curve
        ref_um = 2.2
        hc_over_k = 14387.77
        temp_k = 3200.0
        val = 1.0 / (wavelength_um ** 3 * (math.exp(min(50.0, hc_over_k / (wavelength_um * temp_k))) - 1.0))
        ref = 1.0 / (ref_um ** 3 * (math.exp(min(50.0, hc_over_k / (ref_um * temp_k))) - 1.0))
        return max(0.15, min(2.4, val / ref))


def render_simulated_field(
    center_ra_deg: float,
    center_dec_deg: float,
    fov_arcmin: float,
    epoch_year: float,
    band_number: int = 62,
    target: Optional[CelestialTargetModel] = None,
    flux_multiplier: float = 1.0,
    include_synthetic_mover: bool = False,
    width: int = 256,
    height: int = 256,
) -> np.ndarray:
    """Render calibrated 2D float32 image array with stars, PSF, proper motion, and noise."""
    band = get_spherex_band(band_number)
    wl_um = band.wavelength_um

    buffer = np.zeros((height, width), dtype=np.float32)

    # 1. Background field stars seeded deterministically by sky position
    rng = np.random.RandomState(seed_from_coords(center_ra_deg, center_dec_deg))
    n_stars = 48
    fov_deg = fov_arcmin / 60.0
    cos_dec = max(0.01, math.cos(center_dec_deg * math.pi / 180.0))

    stars_x = []
    stars_y = []
    stars_flux = []

    for i in range(n_stars):
        dx_deg = (rng.uniform() - 0.5) * fov_deg * 1.25
        dy_deg = (rng.uniform() - 0.5) * fov_deg * 1.25
        s_ra = center_ra_deg + dx_deg / cos_dec
        s_dec = max(-89.9, min(89.9, center_dec_deg + dy_deg))

        px, py = wcs_to_pixel(s_ra, s_dec, width, height, center_ra_deg, center_dec_deg, fov_arcmin)
        if -8 <= px < width + 8 and -8 <= py < height + 8:
            base_flux = 0.15 + (rng.uniform() ** 2.5) * 0.85
            stars_x.append(px)
            stars_y.append(py)
            stars_flux.append(base_flux)

    # 2. Add Target Object (with proper motion propagation)
    if target:
        t_ra, t_dec = propagate_proper_motion(
            target.ra_deg,
            target.dec_deg,
            target.pm_ra_cosdec_mas_yr,
            target.pm_dec_mas_yr,
            target.reference_epoch_year,
            epoch_year,
        )
        t_px, t_py = wcs_to_pixel(
            t_ra, t_dec, width, height, center_ra_deg, center_dec_deg, fov_arcmin
        )
        resp = target_spectral_response(target.spectral_profile, wl_um)
        target_flux = 1.65 * resp * flux_multiplier
        stars_x.append(t_px)
        stars_y.append(t_py)
        stars_flux.append(target_flux)

    # 3. Optional synthetic high proper motion mover for field testing
    if include_synthetic_mover and not target:
        ref_year = 2010.0
        dt = epoch_year - ref_year
        # Moves ~5 arcsec/yr southwest
        m_ra, m_dec = propagate_proper_motion(
            center_ra_deg + 0.005,
            center_dec_deg + 0.005,
            -3500.0,
            -3500.0,
            ref_year,
            epoch_year,
        )
        m_px, m_py = wcs_to_pixel(
            m_ra, m_dec, width, height, center_ra_deg, center_dec_deg, fov_arcmin
        )
        stars_x.append(m_px)
        stars_y.append(m_py)
        stars_flux.append(1.20)

    # 4. Paint PSF for each source onto buffer
    y_grid, x_grid = np.indices((height, width), dtype=np.float32)

    for px, py, flux in zip(stars_x, stars_y, stars_flux):
        r2 = (x_grid - px) ** 2 + (y_grid - py) ** 2
        # Gaussian core + Moffat power-law wings
        core = flux * np.exp(-r2 / 4.5)
        wings = (flux * 0.12) / (1.0 + r2 / 12.0) ** 1.8
        buffer += (core + wings).astype(np.float32)

    # 5. Add calibrated Poisson/Gaussian detector background noise
    noise_rng = np.random.RandomState(int(round(epoch_year * 100)) & 0xFFFFFFFF)
    bg_level = 0.04
    noise = noise_rng.normal(0.0, 0.012, (height, width)).astype(np.float32)
    buffer = np.clip(buffer + bg_level + noise, 0.0, 50.0)

    return buffer

