"""NASA/IPAC IRSA SPHEREx TAP service integration, ADQL generation, and 102-band model."""
import logging
from typing import Any, Dict, List, Optional
import httpx
from ..models.spectrum import (
    SpherexBandModel,
    SpherexDetectorArrayModel,
    SpherexTapResponse,
)

logger = logging.getLogger(__name__)

SPHEREX_ARRAYS_CONFIG: List[Dict[str, Any]] = [
    {
        "array_id": 1,
        "name": "Band 1 · Short-Wave NIR",
        "min_um": 0.75,
        "max_um": 1.11,
        "resolving_power": 41,
        "band_start": 1,
        "band_end": 17,
        "primary_science_focus": "Stellar photospheres, galaxy redshifts & M/L-dwarf continua",
    },
    {
        "array_id": 2,
        "name": "Band 2 · J / H Window",
        "min_um": 1.11,
        "max_um": 1.64,
        "resolving_power": 41,
        "band_start": 18,
        "band_end": 34,
        "primary_science_focus": "Methane (CH4) & H2O steam bands in brown dwarfs and Y/T objects",
    },
    {
        "array_id": 3,
        "name": "Band 3 · K-Band Thermal",
        "min_um": 1.64,
        "max_um": 2.42,
        "resolving_power": 41,
        "band_start": 35,
        "band_end": 51,
        "primary_science_focus": "Circumstellar dust excess, H2O vapor & evolved giant continua",
    },
    {
        "array_id": 4,
        "name": "Band 4 · Ice & PAH Bridge",
        "min_um": 2.42,
        "max_um": 3.82,
        "resolving_power": 35,
        "band_start": 52,
        "band_end": 68,
        "primary_science_focus": "H2O ice (3.05 µm), PAH emission (3.3 µm) & deep CH4 features",
    },
    {
        "array_id": 5,
        "name": "Band 5 · CO2 Ice Channel",
        "min_um": 3.82,
        "max_um": 4.42,
        "resolving_power": 110,
        "band_start": 69,
        "band_end": 85,
        "primary_science_focus": "CO2 ice absorption (4.27 µm) & cold substellar thermal emission",
    },
    {
        "array_id": 6,
        "name": "Band 6 · Long-Wave Thermal",
        "min_um": 4.42,
        "max_um": 5.00,
        "resolving_power": 130,
        "band_start": 86,
        "band_end": 102,
        "primary_science_focus": "CO ice (4.67 µm), 4.8 µm Y-dwarf peak & cold Planet X searches",
    },
]

SPHEREX_ARRAYS: List[SpherexDetectorArrayModel] = [
    SpherexDetectorArrayModel(**c) for c in SPHEREX_ARRAYS_CONFIG
]


def tracer_for_wavelength(um: float) -> str:
    """Astronomical tracer annotation for a specific infrared wavelength."""
    if um < 1.05:
        return "Optical-NIR stellar continuum"
    if 1.35 <= um <= 1.50:
        return "H2O vapor absorption band"
    if 1.60 <= um <= 1.75:
        return "CH4 H-band continuum feature"
    if 2.10 <= um <= 2.35:
        return "CO overtone & K-band flux"
    if 2.95 <= um <= 3.18:
        return "H2O ice absorption (3.05 µm)"
    if 3.25 <= um <= 3.45:
        return "PAH (3.3 µm) / CH4 fundamental"
    if 4.18 <= um <= 4.35:
        return "CO2 ice absorption (4.27 µm)"
    if 4.55 <= um <= 4.78:
        return "CO ice (4.67 µm) & Y-dwarf 4.8 µm window"
    return "Broadband infrared continuum"


def build_spherex_bands() -> List[SpherexBandModel]:
    """Generate all 102 SPHEREx LVF spectral channels with resolving power and tracer notes."""
    bands: List[SpherexBandModel] = []
    band_counter = 1

    for arr in SPHEREX_ARRAYS:
        n_bands = (arr.band_end - arr.band_start) + 1
        delta_lambda = (arr.max_um - arr.min_um) / n_bands

        for i in range(n_bands):
            wl = arr.min_um + (i + 0.5) * delta_lambda
            bands.append(
                SpherexBandModel(
                    band_number=band_counter,
                    array_id=arr.array_id,
                    wavelength_um=round(wl, 4),
                    bandwidth_um=round(delta_lambda, 5),
                    resolving_power=arr.resolving_power,
                    tracer_note=tracer_for_wavelength(wl),
                )
            )
            band_counter += 1

    return bands


SPHEREX_BANDS = build_spherex_bands()
SPHEREX_BAND_MAP: Dict[int, SpherexBandModel] = {b.band_number: b for b in SPHEREX_BANDS}


def get_spherex_band(band_number: int) -> SpherexBandModel:
    """Get single SPHEREx band by number (1..102)."""
    clamped = max(1, min(102, band_number))
    return SPHEREX_BAND_MAP[clamped]


def build_spherex_tap_adql(
    ra_deg: float,
    dec_deg: float,
    size_deg: float = 0.1,
    bandpass: str = "SPHEREx-D2",
) -> str:
    """Construct verified TAP ADQL query joining spherex.artifact and spherex.plane."""
    ra = f"{ra_deg:.5f}"
    dec = f"{dec_deg:.5f}"
    size = f"{size_deg:.4f}"
    safe_bandpass = bandpass if bandpass in {f"SPHEREx-D{i}" for i in range(1, 7)} else "SPHEREx-D2"

    return (
        f"SELECT\n"
        f"  'https://irsa.ipac.caltech.edu/' || a.uri || '?center={ra},{dec}d&size={size}' AS uri,\n"
        f"  p.time_bounds_lower\n"
        f"FROM spherex.artifact a\n"
        f"JOIN spherex.plane p ON a.planeid = p.planeid\n"
        f"WHERE 1 = CONTAINS(POINT('ICRS', {ra}, {dec}), p.poly)\n"
        f"  AND p.energy_bandpassname = '{safe_bandpass}'\n"
        f"ORDER BY p.time_bounds_lower"
    )


# Official Caltech/IPAC IRSA M101 tutorial dataset
M101_RA_DEG = 210.80227
M101_DEC_DEG = 54.34895

SPHEREX_TUTORIAL_BASE_CUTOUTS = [
    {
        "release": "DR1",
        "obs_week": "2025W20_2D",
        "pipeline_version": "l2b-v27-2026-198",
        "exposure_id": "0176_4D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W20_2D/l2b-v27-2026-198/2/level2_2025W20_2D_0176_4D2_spx_l2b-v27-2026-198.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W21_2C",
        "pipeline_version": "l2b-v27-2026-199",
        "exposure_id": "0401_1D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W21_2C/l2b-v27-2026-199/2/level2_2025W21_2C_0401_1D2_spx_l2b-v27-2026-199.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W21_2C",
        "pipeline_version": "l2b-v27-2026-199",
        "exposure_id": "0401_3D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W21_2C/l2b-v27-2026-199/2/level2_2025W21_2C_0401_3D2_spx_l2b-v27-2026-199.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W21_2C",
        "pipeline_version": "l2b_retry-v27-2026-199",
        "exposure_id": "0401_4D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W21_2C/l2b_retry-v27-2026-199/2/level2_2025W21_2C_0401_4D2_spx_l2b_retry-v27-2026-199.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W49_2A",
        "pipeline_version": "l2b-v27-2026-209",
        "exposure_id": "0426_2D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0426_2D2_spx_l2b-v27-2026-209.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W49_2A",
        "pipeline_version": "l2b-v27-2026-209",
        "exposure_id": "0650_1D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0650_1D2_spx_l2b-v27-2026-209.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W49_2A",
        "pipeline_version": "l2b-v27-2026-209",
        "exposure_id": "0707_1D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0707_1D2_spx_l2b-v27-2026-209.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W50_2A",
        "pipeline_version": "l2b-v27-2026-210",
        "exposure_id": "0072_2D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W50_2A/l2b-v27-2026-210/2/level2_2025W50_2A_0072_2D2_spx_l2b-v27-2026-210.fits",
    },
    {
        "release": "DR1",
        "obs_week": "2025W50_2A",
        "pipeline_version": "l2b-v27-2026-210",
        "exposure_id": "0072_4D2",
        "relative_path": "ibe/data/spherex/dr1/level2/2025W50_2A/l2b-v27-2026-210/2/level2_2025W50_2A_0072_4D2_spx_l2b-v27-2026-210.fits",
    },
    {
        "release": "QR3",
        "obs_week": "2026W20_2A",
        "pipeline_version": "l2b-v27-2026-267",
        "exposure_id": "0464_4D2",
        "relative_path": "ibe/data/spherex/qr3/level2/2026W20_2A/l2b-v27-2026-267/2/level2_2026W20_2A_0464_4D2_spx_l2b-v27-2026-267.fits",
    },
    {
        "release": "QR3",
        "obs_week": "2026W21_2A",
        "pipeline_version": "l2b-v27-2026-268",
        "exposure_id": "0213_1D2",
        "relative_path": "ibe/data/spherex/qr3/level2/2026W21_2A/l2b-v27-2026-268/2/level2_2026W21_2A_0213_1D2_spx_l2b-v27-2026-268.fits",
    },
    {
        "release": "QR3",
        "obs_week": "2026W25_2A",
        "pipeline_version": "l2b-v27-2026-273",
        "exposure_id": "0279_1D2",
        "relative_path": "ibe/data/spherex/qr3/level2/2026W25_2A/l2b-v27-2026-273/2/level2_2026W25_2A_0279_1D2_spx_l2b-v27-2026-273.fits",
    },
    {
        "release": "QR3",
        "obs_week": "2026W26_1A",
        "pipeline_version": "l2b-v27-2026-273",
        "exposure_id": "0178_1D2",
        "relative_path": "ibe/data/spherex/qr3/level2/2026W26_1A/l2b-v27-2026-273/2/level2_2026W26_1A_0178_1D2_spx_l2b-v27-2026-273.fits",
    },
    {
        "release": "QR3",
        "obs_week": "2026W26_1A",
        "pipeline_version": "l2b_retry-v27-2026-274",
        "exposure_id": "0500_1D2",
        "relative_path": "ibe/data/spherex/qr3/level2/2026W26_1A/l2b_retry-v27-2026-274/2/level2_2026W26_1A_0500_1D2_spx_l2b_retry-v27-2026-274.fits",
    },
]

SPHEREX_TUTORIAL_CUTOUTS: List[Dict[str, Any]] = [
    {
        "index": idx + 1,
        "release": item["release"],
        "obsWeek": item["obs_week"],
        "exposureId": item["exposure_id"],
        "detector": "SPHEREx-D2",
        "pipelineVersion": item["pipeline_version"],
        "uri": f"https://irsa.ipac.caltech.edu/{item['relative_path']}?center={M101_RA_DEG},{M101_DEC_DEG}d&size=0.1",
    }
    for idx, item in enumerate(SPHEREX_TUTORIAL_BASE_CUTOUTS)
]


def is_near_m101(ra_deg: float, dec_deg: float, tolerance_deg: float = 0.5) -> bool:
    """Check if coordinates fall within tolerance of M101 tutorial reference position."""
    return (
        abs(ra_deg - M101_RA_DEG) <= tolerance_deg
        and abs(dec_deg - M101_DEC_DEG) <= tolerance_deg
    )


async def query_spherex_cutouts(
    ra_deg: float,
    dec_deg: float,
    size_deg: float = 0.1,
    bandpass: str = "SPHEREx-D2",
    timeout_sec: float = 4.5,
) -> SpherexTapResponse:
    """Query NASA/IPAC IRSA TAP for real SPHEREx cutouts or supply verified tutorial reference."""
    adql = build_spherex_tap_adql(ra_deg, dec_deg, size_deg, bandpass)

    try:
        url = "https://irsa.ipac.caltech.edu/TAP/sync"
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.get(
                url,
                params={"QUERY": adql, "FORMAT": "json"},
                headers={"User-Agent": "AFTERLIGHT-SPHEREx-Explorer/1.0 (NASA-SpaceApps-2026)"},
            )
            if resp.status_code == 200:
                payload = resp.json()
                metadata = payload.get("metadata", [])
                data = payload.get("data", [])
                if metadata and data:
                    cols = [m.get("name") for m in metadata]
                    rows = []
                    for idx, row in enumerate(data):
                        row_dict = {col: row[c_idx] for c_idx, col in enumerate(cols)}
                        uri = str(row_dict.get("uri", ""))
                        is_qr3 = "/qr3/" in uri
                        parts = uri.split("/")
                        obs_week = next((p for p in parts if p.startswith("202")), "SPHEREx")
                        version = next((p for p in parts if p.startswith("l2b")), "l2b")
                        file_name = parts[-1].split("?")[0] if parts else ""
                        import re

                        exp_match = re.search(r"(\d{4}_\d[A-Z]\d)", file_name)
                        exp_id = exp_match.group(1) if exp_match else f"EXP-{idx + 1}"

                        rows.append(
                            {
                                "index": idx + 1,
                                "release": "QR3" if is_qr3 else "DR1",
                                "obsWeek": obs_week,
                                "exposureId": exp_id,
                                "detector": bandpass,
                                "pipelineVersion": version,
                                "timeBoundsLower": row_dict.get("time_bounds_lower"),
                                "uri": uri,
                            }
                        )

                    return SpherexTapResponse(
                        ok=True,
                        data_mode="live-archive",
                        source="NASA/IPAC IRSA SPHEREx TAP (spherex.artifact / spherex.plane)",
                        adql=adql,
                        rows=rows,
                    )
    except Exception as exc:
        logger.warning("SPHEREx TAP query to IRSA failed: %s", exc)

    # Clean fallback: If coordinates are near M101, return official tutorial dataset
    near = is_near_m101(ra_deg, dec_deg)
    return SpherexTapResponse(
        ok=True,
        data_mode="tutorial-reference",
        source=(
            "Caltech/IPAC IRSA SPHEREx Cutouts Tutorial Dataset (M101 DR1/QR3 Reference)"
            if near
            else "IRSA SPHEREx TAP unreachable from runtime (showing ADQL query + M101 tutorial reference)"
        ),
        adql=adql,
        rows=SPHEREX_TUTORIAL_CUTOUTS if near else [],
    )

