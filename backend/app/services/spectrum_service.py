"""Infrared Wavelength Explorer: 102-Band SED modeling and IRSA AllWISE TAP queries."""
import logging
import math
from typing import Any, Dict, List, Optional
import httpx
from ..models.spectrum import SedPoint, SedResponse
from .spherex import SPHEREX_BANDS, get_spherex_band
from .targets import get_curated_target

logger = logging.getLogger(__name__)


def planck_flux(wavelength_um: float, temp_k: float) -> float:
    """Planck blackbody radiation function normalized in arbitrary flux units."""
    hc_over_k = 14387.77
    exp_arg = min(75.0, hc_over_k / (wavelength_um * temp_k))
    return 1.0 / (wavelength_um ** 5 * (math.exp(exp_arg) - 1.0))


def compute_spectral_energy_distribution(
    profile: str = "field-star",
    scale_flux_mjy: float = 25.0,
    target_name: str = "Target",
) -> SedResponse:
    """Compute 102-channel calibrated SED curve with molecular absorption and emission features."""
    points: List[SedPoint] = []
    features: List[str] = []

    # Identify molecular features relevant to profile
    if profile == "y-dwarf":
        features = [
            "H2O vapor steam absorption (1.4 µm)",
            "CH4 methane band (1.66 µm & 3.3 µm)",
            "Thermal flux window peak (4.8 µm)",
        ]
    elif profile == "t-dwarf":
        features = [
            "Deep CH4 methane absorption (1.66 µm & 3.3 µm)",
            "H2O atmospheric vapor (1.4 µm & 1.9 µm)",
            "CO overtone band (2.3 µm)",
        ]
    elif profile == "t-tauri-dust":
        features = [
            "Circumstellar dust thermal excess (> 2 µm)",
            "H2O ice absorption mantle (3.05 µm)",
            "PAH hydrocarbon emission (3.3 µm)",
        ]
    elif profile == "mira-giant":
        features = [
            "TiO and VO molecular absorption bands (< 1.2 µm)",
            "H2O steam atmospheric veil (1.4 µm & 1.9 µm)",
            "Circumstellar silicate dust envelope (> 3.5 µm)",
        ]
    else:
        features = ["Broadband infrared stellar photosphere"]

    for band in SPHEREX_BANDS:
        wl = band.wavelength_um
        flux = 0.0
        is_feature = False

        if profile == "y-dwarf":
            # Extremely cold brown dwarf (~250 K)
            base = planck_flux(wl, 280.0)
            ch4_fund = math.exp(-(((wl - 3.3) / 0.22) ** 2))
            h2o = math.exp(-(((wl - 1.4) / 0.15) ** 2))
            thermal_bump = 2.4 * math.exp(-(((wl - 4.75) / 0.35) ** 2))
            flux = (base * 1e8 * (1.0 - 0.75 * ch4_fund - 0.65 * h2o) + thermal_bump)
            if wl < 2.0:
                flux *= 0.05
            is_feature = (3.1 <= wl <= 3.5) or (4.5 <= wl <= 4.9)

        elif profile == "t-dwarf":
            # Cool methane dwarf (~1100 K)
            base = planck_flux(wl, 1150.0)
            ch4_16 = math.exp(-(((wl - 1.66) / 0.08) ** 2))
            ch4_33 = math.exp(-(((wl - 3.3) / 0.25) ** 2))
            h2o_14 = math.exp(-(((wl - 1.4) / 0.12) ** 2))
            attenuation = max(0.12, 1.0 - 0.68 * ch4_16 - 0.82 * ch4_33 - 0.60 * h2o_14)
            flux = base * 1e6 * attenuation
            is_feature = (1.58 <= wl <= 1.74) or (3.1 <= wl <= 3.55)

        elif profile == "t-tauri-dust":
            # Pre-main sequence star with warm circumstellar dust disc
            star = planck_flux(wl, 4100.0) * 1e4
            dust = planck_flux(wl, 650.0) * 1e6 * 0.45
            ice = 1.0 - 0.38 * math.exp(-(((wl - 3.05) / 0.18) ** 2))
            pah = 0.35 * math.exp(-(((wl - 3.3) / 0.06) ** 2))
            flux = (star + dust) * ice + pah
            is_feature = (2.95 <= wl <= 3.4)

        elif profile == "mira-giant":
            # Cool AGB giant (~2400 K)
            base = planck_flux(wl, 2400.0) * 1e5
            h2o = 1.0 - 0.32 * math.exp(-(((wl - 1.4) / 0.15) ** 2))
            co = 1.0 - 0.28 * math.exp(-(((wl - 2.35) / 0.12) ** 2))
            flux = base * h2o * co
            is_feature = (1.35 <= wl <= 1.5) or (2.28 <= wl <= 2.45)

        else:
            # Field star
            flux = planck_flux(wl, 4800.0) * 1e4

        points.append(
            SedPoint(
                band_number=band.band_number,
                wavelength_um=wl,
                flux_mjy=round(max(0.01, flux), 4),
                array_id=band.array_id,
                tracer_note=band.tracer_note,
                is_feature=is_feature,
            )
        )

    # Normalize curve to requested scale_flux_mjy
    max_f = max(p.flux_mjy for p in points)
    if max_f > 0:
        factor = scale_flux_mjy / max_f
        for p in points:
            p.flux_mjy = round(p.flux_mjy * factor, 3)

    return SedResponse(
        ok=True,
        target_name=target_name,
        spectral_profile=profile,
        scale_flux_mjy=scale_flux_mjy,
        data_mode="demonstration",
        provenance="Physical 102-Band SPHEREx Spectrophotometric Reference Model",
        molecular_features=features,
        points=points,
    )


async def query_irsa_allwise_catalog(
    ra_deg: float,
    dec_deg: float,
    radius_arcsec: float = 120.0,
    timeout_sec: float = 4.0,
) -> Dict[str, Any]:
    """Query NASA/IPAC IRSA TAP for AllWISE point source catalog (allwise_p3as_psd)."""
    radius_deg = max(0.002, min(0.166, radius_arcsec / 3600.0))
    adql = (
        f"SELECT TOP 12 designation, ra, dec, w1mpro, w2mpro, w3mpro "
        f"FROM allwise_p3as_psd "
        f"WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra_deg:.6f}, {dec_deg:.6f}, {radius_deg:.6f}))=1"
    )

    try:
        url = "https://irsa.ipac.caltech.edu/TAP/sync"
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.get(
                url,
                params={"QUERY": adql, "FORMAT": "json"},
                headers={"User-Agent": "AFTERLIGHT-Astronomical-API/1.0"},
            )
            if resp.status_code == 200:
                payload = resp.json()
                metadata = payload.get("metadata", [])
                data = payload.get("data", [])
                if metadata and data:
                    cols = [m.get("name") for m in metadata]
                    rows = []
                    for r in data:
                        obj = {col: r[idx] for idx, col in enumerate(cols)}
                        rows.append(obj)

                    return {
                        "ok": True,
                        "data_mode": "live-archive",
                        "source": "NASA/IPAC IRSA AllWISE TAP",
                        "rows": rows,
                    }
    except Exception as exc:
        logger.warning("IRSA AllWISE TAP query failed: %s", exc)

    return {
        "ok": True,
        "data_mode": "demonstration",
        "source": "Calibrated Demonstration Reference (IRSA TAP offline or unreachable)",
        "rows": [],
    }

