"""Curated astronomical targets and remote CDS Sesame / SIMBAD resolution service."""
import logging
from typing import Dict, List, Optional
import httpx
from ..models.target import (
    CelestialTargetModel,
    CoordinateValidationResult,
    ObservationEpochModel,
    TargetResolveResponse,
    TargetSearchResponse,
)
from .astronomy import (
    format_dec_dms,
    format_ra_hms,
    parse_coordinate_pair,
    parse_dec,
    parse_ra,
)

logger = logging.getLogger(__name__)

# Complete Curated Benchmark Catalog
CURATED_TARGETS_LIST: List[Dict] = [
    {
        "id": "barnards-star",
        "name": "Barnard's Star",
        "catalog_designation": "V2500 Ophiuchi · Gaia DR3 4472832130942575872",
        "category": "Red Dwarf",
        "constellation": "Ophiuchus",
        "ra_string": "17h 57m 48.50s",
        "dec_string": "+04° 41' 36.1\"",
        "ra_deg": 269.452077,
        "dec_deg": 4.693365,
        "distance_ly": "5.96 ly",
        "spectral_type": "M4.0V",
        "spectral_profile": "m-dwarf",
        "pm_ra_cosdec_mas_yr": -801.55,
        "pm_dec_mas_yr": 10362.39,
        "total_proper_motion_arcsec_yr": 10.358,
        "reference_epoch_year": 2016.0,
        "scale_flux_mjy": 4200.0,
        "default_fov_arcmin": 8.0,
        "short_description": "The fastest-moving star across Earth's sky, shifting 10.36 arcseconds northward every year against background stars.",
        "scientific_summary": "Discovered to possess extreme proper motion by E. E. Barnard in 1916, Barnard's Star is the second-closest known stellar system to the Sun. Over multi-year infrared baselines spanning AllWISE, NEOWISE, and SPHEREx, its rapid northward trajectory produces an unambiguous positional shift exceeding 1.5 arcminutes over a decade, serving as an ideal astrometric benchmark for moving-object detection algorithms.",
        "caption": "Illustrative near-infrared field centered on Barnard's Star (M4V) in Ophiuchus. Use the Observation Explorer to inspect multi-epoch proper motion across calibrated sky coordinates.",
        "image_url": "/src/assets/images/obj_barnards_star_1794646430991.jpg",
        "image_attribution": "Illustrative Reference Plate · Demonstration Visualization",
        "instrument_info": "SPHEREx 102-Band LVF Spectrophotometer (0.75–5.00 µm) / AllWISE W1–W2 Reference",
        "data_source": "NASA/IPAC IRSA · Gaia DR3 · AllWISE / NEOWISE",
        "available_wavelengths": "0.75 – 5.00 µm (Bands 1–102 simulated; WISE 3.4 & 4.6 µm archival)",
        "epochs": [
            {
                "id": "barnard-2010",
                "date_iso": "2010-03-18",
                "year_decimal": 2010.21,
                "instrument": "WISE Cryogenic Survey",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 1.0,
                "data_provenance": "Archival Survey Reference",
                "notes": "Initial cryogenic WISE epoch baseline.",
            },
            {
                "id": "barnard-2015",
                "date_iso": "2015-09-14",
                "year_decimal": 2015.70,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 1.02,
                "data_provenance": "Archival Survey Reference",
                "notes": "Mid-baseline reactivation pass (+56.9\" northward shift).",
            },
            {
                "id": "barnard-2020",
                "date_iso": "2020-09-12",
                "year_decimal": 2020.70,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 90,
                "flux_multiplier": 0.98,
                "data_provenance": "Archival Survey Reference",
                "notes": "10-year baseline epoch (+108.7\" total displacement).",
            },
            {
                "id": "barnard-2025",
                "date_iso": "2025-09-15",
                "year_decimal": 2025.71,
                "instrument": "SPHEREx All-Sky Survey (Simulated)",
                "wavelength_label": "1.65 µm (Array 3)",
                "band_number": 35,
                "flux_multiplier": 1.04,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Modelled SPHEREx epoch showing 15.5-year accumulated proper motion.",
            },
        ],
        "related_ids": ["wise-0855", "epsilon-indi-b"],
    },
    {
        "id": "epsilon-indi-b",
        "name": "Epsilon Indi B",
        "catalog_designation": "eps Ind Ba / Bb · WISEP J220410.52-564657.7",
        "category": "Brown Dwarf Binary",
        "constellation": "Indus",
        "ra_string": "22h 04m 10.52s",
        "dec_string": "-56° 46' 57.7\"",
        "ra_deg": 331.043833,
        "dec_deg": -56.782694,
        "distance_ly": "11.87 ly",
        "spectral_type": "T1V + T6V Binary",
        "spectral_profile": "t-dwarf",
        "pm_ra_cosdec_mas_yr": 3966.66,
        "pm_dec_mas_yr": -2536.19,
        "total_proper_motion_arcsec_yr": 4.708,
        "reference_epoch_year": 2016.0,
        "scale_flux_mjy": 85.0,
        "default_fov_arcmin": 8.0,
        "short_description": "A resolved binary pair of cool T-type brown dwarfs orbiting the K-dwarf Epsilon Indi at 4.71 arcseconds per year.",
        "scientific_summary": "Epsilon Indi Ba and Bb form one of the closest known brown dwarf binaries to our solar system. With effective temperatures around 1,300 K and 880 K respectively, their combined near-infrared spectrum exhibits deep methane (CH4) and water vapor absorption troughs across SPHEREx Arrays 2 through 4, while their high proper motion carries them rapidly southeast across the Indus starfield.",
        "caption": "Illustrative infrared observation field of the Epsilon Indi Ba/Bb brown dwarf pair. Notice the warm crimson-amber spectral signature characteristic of cool methane-bearing atmospheres.",
        "image_url": "/src/assets/images/obj_epsilon_indi_1794646431913.jpg",
        "image_attribution": "Illustrative Reference Plate · Demonstration Visualization",
        "instrument_info": "SPHEREx 102-Band LVF Spectrophotometer / 2MASS & AllWISE Reference",
        "data_source": "NASA/IPAC IRSA · 2MASS · AllWISE · Gaia DR3",
        "available_wavelengths": "0.75 – 5.00 µm (Methane & H2O spectral bands)",
        "epochs": [
            {
                "id": "eps-2010",
                "date_iso": "2010-05-04",
                "year_decimal": 2010.34,
                "instrument": "WISE Cryogenic Survey",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 1.0,
                "data_provenance": "Archival Survey Reference",
                "notes": "Early AllWISE epoch reference.",
            },
            {
                "id": "eps-2016",
                "date_iso": "2016-05-09",
                "year_decimal": 2016.35,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 90,
                "flux_multiplier": 0.99,
                "data_provenance": "Archival Survey Reference",
                "notes": "Six-year epoch showing 28.3\" southeast displacement.",
            },
            {
                "id": "eps-2021",
                "date_iso": "2021-05-12",
                "year_decimal": 2021.36,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 90,
                "flux_multiplier": 1.01,
                "data_provenance": "Archival Survey Reference",
                "notes": "Eleven-year epoch showing 51.8\" cumulative displacement.",
            },
            {
                "id": "eps-2025",
                "date_iso": "2025-05-15",
                "year_decimal": 2025.37,
                "instrument": "SPHEREx All-Sky Survey (Simulated)",
                "wavelength_label": "2.15 µm (Array 3)",
                "band_number": 45,
                "flux_multiplier": 1.0,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Modelled SPHEREx near-infrared epoch.",
            },
        ],
        "related_ids": ["wise-0855", "barnards-star"],
    },
    {
        "id": "wise-0855",
        "name": "WISE 0855",
        "catalog_designation": "WISE J085510.83-071442.5",
        "category": "Y-Type Brown Dwarf",
        "constellation": "Hydra",
        "ra_string": "08h 55m 10.831s",
        "dec_string": "-07° 14' 42.53\"",
        "ra_deg": 133.795129,
        "dec_deg": -7.245147,
        "distance_ly": "7.42 ly",
        "spectral_type": "Y2 / Y4 (250 K)",
        "spectral_profile": "y-dwarf",
        "pm_ra_cosdec_mas_yr": -8118.0,
        "pm_dec_mas_yr": 680.0,
        "total_proper_motion_arcsec_yr": 8.146,
        "reference_epoch_year": 2014.0,
        "scale_flux_mjy": 3.4,
        "default_fov_arcmin": 8.0,
        "short_description": "The coldest known brown dwarf (~250 K), virtually invisible in optical light and glowing primarily around 4.5–5.0 µm.",
        "scientific_summary": "Discovered in 2014 using multi-epoch WISE mid-infrared data, WISE 0855 is an extreme Y-type substellar object with an effective temperature comparable to a brisk polar winter on Earth (~250 K). Because its spectral energy distribution peaks steeply in SPHEREx Array 6 (4.42–5.00 µm) while dropping sharply below 2.5 µm, it represents a premier Planet X-analog benchmark for faint, cold, fast-moving infrared discoveries.",
        "caption": "Illustrative mid-infrared field centered on WISE J085510.83-071442.5 in Hydra. In short-wave near-infrared bands (< 2.0 µm) the object fades into the background noise, emerging clearly in Array 6 (4.4–5.0 µm).",
        "image_url": "/src/assets/images/obj_wise_0855_1794646432599.jpg",
        "image_attribution": "Illustrative Reference Plate · Demonstration Visualization",
        "instrument_info": "SPHEREx Array 5–6 (3.82–5.00 µm) / AllWISE & NEOWISE W2 (4.6 µm)",
        "data_source": "NASA/IPAC IRSA · AllWISE · NEOWISE · Spitzer",
        "available_wavelengths": "3.40 – 5.00 µm (Peak thermal emission in Array 6)",
        "epochs": [
            {
                "id": "wise0855-2010",
                "date_iso": "2010-05-04",
                "year_decimal": 2010.34,
                "instrument": "WISE Cryogenic Survey",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 92,
                "flux_multiplier": 1.0,
                "data_provenance": "Archival Survey Reference",
                "notes": "Discovery-era WISE W2 detection.",
            },
            {
                "id": "wise0855-2014",
                "date_iso": "2014-05-03",
                "year_decimal": 2014.34,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 92,
                "flux_multiplier": 0.99,
                "data_provenance": "Archival Survey Reference",
                "notes": "Reference epoch (08h55m10.831s, -07d14m42.53s); 32.6\" westward shift since 2010.",
            },
            {
                "id": "wise0855-2019",
                "date_iso": "2019-11-18",
                "year_decimal": 2019.88,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 92,
                "flux_multiplier": 1.02,
                "data_provenance": "Archival Survey Reference",
                "notes": "High-S/N stacked pass confirming 8.15\"/yr westward motion.",
            },
            {
                "id": "wise0855-2025",
                "date_iso": "2025-11-12",
                "year_decimal": 2025.86,
                "instrument": "SPHEREx All-Sky Survey (Simulated)",
                "wavelength_label": "4.78 µm (Array 6)",
                "band_number": 96,
                "flux_multiplier": 1.01,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Modelled SPHEREx Array 6 detection at 4.78 µm.",
            },
        ],
        "related_ids": ["epsilon-indi-b", "barnards-star"],
    },
    {
        "id": "rw-aurigae",
        "name": "RW Aurigae",
        "catalog_designation": "RW Aur A/B · HD 240764",
        "category": "T Tauri Variable",
        "constellation": "Auriga",
        "ra_string": "05h 07m 49.57s",
        "dec_string": "+30° 24' 05.1\"",
        "ra_deg": 76.956542,
        "dec_deg": 30.401417,
        "distance_ly": "532 ly",
        "spectral_type": "K3e + K5e T Tauri",
        "spectral_profile": "t-tauri-dust",
        "pm_ra_cosdec_mas_yr": 1.12,
        "pm_dec_mas_yr": -22.34,
        "total_proper_motion_arcsec_yr": 0.022,
        "reference_epoch_year": 2016.0,
        "scale_flux_mjy": 380.0,
        "default_fov_arcmin": 8.0,
        "short_description": "A famous young binary with disrupted protoplanetary dust disks undergoing severe multi-magnitude optical-infrared dimming events.",
        "scientific_summary": "RW Aurigae consists of two young pre-main-sequence stars (~few million years old) enclosed in disrupted circumstellar and circumbinary gas and dust streams. Tidal interactions between star A and star B have produced elongated tidal arms and recurrent major photometric dimming events lasting months to years, creating pronounced infrared flux variations across SPHEREx Arrays 3 through 6.",
        "caption": "Illustrative infrared field centered on RW Aurigae in the Taurus-Auriga star-forming complex. Note the stationary position but substantial mid-infrared photometric variability across observation epochs.",
        "image_url": "/src/assets/images/obj_rw_aurigae_1794646431885.jpg",
        "image_attribution": "Illustrative Reference Plate · Demonstration Visualization",
        "instrument_info": "SPHEREx 102-Band LVF Spectrophotometer / AllWISE & 2MASS Reference",
        "data_source": "NASA/IPAC IRSA · Gaia DR3 · AllWISE · 2MASS",
        "available_wavelengths": "0.75 – 5.00 µm (Circumstellar dust and gas emission)",
        "epochs": [
            {
                "id": "rw-2010",
                "date_iso": "2010-09-22",
                "year_decimal": 2010.72,
                "instrument": "WISE Cryogenic Survey",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 1.0,
                "data_provenance": "Archival Survey Reference",
                "notes": "High-state cryogenic baseline observation.",
            },
            {
                "id": "rw-2014",
                "date_iso": "2014-10-18",
                "year_decimal": 2014.80,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 0.38,
                "data_provenance": "Archival Survey Reference",
                "notes": "Deep occultation event; ~62% infrared flux attenuation.",
            },
            {
                "id": "rw-2018",
                "date_iso": "2018-03-12",
                "year_decimal": 2018.20,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 90,
                "flux_multiplier": 0.82,
                "data_provenance": "Archival Survey Reference",
                "notes": "Partial disk recovery pass with thermal dust excess.",
            },
            {
                "id": "rw-2025",
                "date_iso": "2025-10-05",
                "year_decimal": 2025.76,
                "instrument": "SPHEREx All-Sky Survey (Simulated)",
                "wavelength_label": "3.05 µm (Array 4)",
                "band_number": 60,
                "flux_multiplier": 0.95,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Modelled SPHEREx epoch monitoring ice and dust features.",
            },
        ],
        "related_ids": ["r-draconis", "barnards-star"],
    },
    {
        "id": "r-draconis",
        "name": "R Draconis",
        "catalog_designation": "HD 149214 · HIP 80582",
        "category": "Mira Variable",
        "constellation": "Draco",
        "ra_string": "16h 32m 40.23s",
        "dec_string": "+66° 45' 18.0\"",
        "ra_deg": 248.167625,
        "dec_deg": 66.755000,
        "distance_ly": "1,450 ly",
        "spectral_type": "M5e - M9e III",
        "spectral_profile": "mira-giant",
        "pm_ra_cosdec_mas_yr": -8.45,
        "pm_dec_mas_yr": 12.18,
        "total_proper_motion_arcsec_yr": 0.015,
        "reference_epoch_year": 2016.0,
        "scale_flux_mjy": 8200.0,
        "default_fov_arcmin": 8.0,
        "short_description": "A classical pulsating red giant star pulsing over a 245-day period, varying by over 6 magnitudes across optical and infrared bands.",
        "scientific_summary": "R Draconis is an asymptotic giant branch (AGB) Mira-type variable star undergoing radial pulsations and mass loss into an expanding circumstellar shell. Its near-infrared flux undergoes large-amplitude cyclical variations, while its spatial position remains fixed against the distant background, demonstrating the difference between photometric variability and genuine proper motion in the Discovery Radar.",
        "caption": "Illustrative infrared field centered on the Mira variable R Draconis. Compare multi-epoch frames to distinguish stationary photometric pulsations from proper-motion displacements.",
        "image_url": "/src/assets/images/obj_r_draconis_1794646432247.jpg",
        "image_attribution": "Illustrative Reference Plate · Demonstration Visualization",
        "instrument_info": "SPHEREx 102-Band LVF Spectrophotometer / AllWISE & 2MASS Reference",
        "data_source": "NASA/IPAC IRSA · AAVSO · Gaia DR3 · AllWISE",
        "available_wavelengths": "0.75 – 5.00 µm (Pulsating molecular envelope)",
        "epochs": [
            {
                "id": "rdrac-2010",
                "date_iso": "2010-06-14",
                "year_decimal": 2010.45,
                "instrument": "WISE Cryogenic Survey",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 1.25,
                "data_provenance": "Archival Survey Reference",
                "notes": "Near-maximum pulsation phase observation.",
            },
            {
                "id": "rdrac-2015",
                "date_iso": "2015-08-20",
                "year_decimal": 2015.63,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "3.4 µm (W1)",
                "band_number": 62,
                "flux_multiplier": 0.42,
                "data_provenance": "Archival Survey Reference",
                "notes": "Near-minimum pulsation phase (~70% infrared dimming).",
            },
            {
                "id": "rdrac-2021",
                "date_iso": "2021-04-10",
                "year_decimal": 2021.27,
                "instrument": "NEOWISE Reactivation",
                "wavelength_label": "4.6 µm (W2)",
                "band_number": 90,
                "flux_multiplier": 1.18,
                "data_provenance": "Archival Survey Reference",
                "notes": "Pulsation crest pass with intense circumstellar CO emission.",
            },
            {
                "id": "rdrac-2025",
                "date_iso": "2025-08-18",
                "year_decimal": 2025.63,
                "instrument": "SPHEREx All-Sky Survey (Simulated)",
                "wavelength_label": "2.35 µm (Array 3)",
                "band_number": 50,
                "flux_multiplier": 0.92,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Modelled SPHEREx epoch probing CO first-overtone bands.",
            },
        ],
        "related_ids": ["rw-aurigae", "barnards-star"],
    },
    {
        "id": "sa-57",
        "name": "SA 57 (Single-Epoch Test Field)",
        "catalog_designation": "Selected Area 57 · North Galactic Pole Reference",
        "category": "Reference Field",
        "constellation": "Coma Berenices",
        "ra_string": "13h 08m 35.00s",
        "dec_string": "+29° 22' 00.0\"",
        "ra_deg": 197.145833,
        "dec_deg": 29.366667,
        "distance_ly": "Extragalactic reference line",
        "spectral_type": "Calibration Field (Faint Stars + Background Galaxies)",
        "spectral_profile": "field-star",
        "pm_ra_cosdec_mas_yr": 0.0,
        "pm_dec_mas_yr": 0.0,
        "total_proper_motion_arcsec_yr": 0.0,
        "reference_epoch_year": 2025.0,
        "scale_flux_mjy": 15.0,
        "default_fov_arcmin": 10.0,
        "short_description": "A single-epoch high-latitude cosmological calibration field near the North Galactic Pole, designed to test single-epoch edge cases.",
        "scientific_summary": "Selected Area 57 is an astrometric and photometric standard field located in Coma Berenices. Because of its extremely low interstellar extinction, it serves as an ideal single-epoch reference field for verifying detector noise, point source sensitivity, and ensuring graceful handling of datasets without multi-epoch baselines.",
        "caption": "Calibrated single-epoch observation plate of Selected Area 57. Use this field to test single-epoch behavior, static field extraction, and edge-case handling.",
        "image_url": "/src/assets/images/hero_spherex_sky_1794646429324.jpg",
        "image_attribution": "Demonstration Reference Plate",
        "instrument_info": "SPHEREx 102-Band Spectrophotometer (Single-Epoch Simulation)",
        "data_source": "NASA/IPAC IRSA · AllWISE · Landolt Standards",
        "available_wavelengths": "0.75 – 5.00 µm (Single-epoch calibration pass)",
        "epochs": [
            {
                "id": "sa57-2025",
                "date_iso": "2025-06-01",
                "year_decimal": 2025.42,
                "instrument": "SPHEREx All-Sky Survey (Calibration Frame)",
                "wavelength_label": "2.20 µm (Array 3)",
                "band_number": 46,
                "flux_multiplier": 1.0,
                "data_provenance": "Simulated SPHEREx Epoch",
                "notes": "Single-epoch baseline calibration test plate.",
            }
        ],
        "related_ids": ["wise-0855", "barnards-star"],
    },
]

CURATED_TARGETS: List[CelestialTargetModel] = [
    CelestialTargetModel(**t) for t in CURATED_TARGETS_LIST
]

CURATED_BY_ID: Dict[str, CelestialTargetModel] = {t.id: t for t in CURATED_TARGETS}


def get_curated_target(target_id: str) -> Optional[CelestialTargetModel]:
    """Retrieve curated target by slug identifier."""
    return CURATED_BY_ID.get(target_id.lower().strip())


def search_curated_targets(query_str: str) -> List[CelestialTargetModel]:
    """Search curated targets by name, designation, constellation, or category."""
    q = query_str.lower().strip()
    if not q:
        return CURATED_TARGETS

    matches = []
    for t in CURATED_TARGETS:
        if (
            q in t.id
            or q in t.name.lower()
            or q in t.catalog_designation.lower()
            or q in t.constellation.lower()
            or q in t.category.lower()
        ):
            matches.append(t)
    return matches


async def resolve_target(query: str, timeout_sec: float = 3.5) -> TargetResolveResponse:
    """Resolve an object name via curated database, coordinate parser, or CDS Sesame."""
    q = query.strip()
    if not q:
        return TargetResolveResponse(
            ok=False,
            source="resolver",
            name=query,
            error="Missing target query string.",
        )

    # 1. Check curated catalog first
    curated_matches = search_curated_targets(q)
    if curated_matches:
        match = curated_matches[0]
        return TargetResolveResponse(
            ok=True,
            source="curated-catalog",
            data_mode="live-archive",
            name=match.name,
            object_type=match.category,
            ra_deg=match.ra_deg,
            dec_deg=match.dec_deg,
            ra_hms=match.ra_string,
            dec_dms=match.dec_string,
        )

    # 2. Check direct coordinate pair
    coord = parse_coordinate_pair(q)
    if coord:
        ra, dec, ra_hms, dec_dms = coord
        return TargetResolveResponse(
            ok=True,
            source="coordinate-parse",
            data_mode="live-coordinate",
            name=f"Sky Position ({ra_hms}, {dec_dms})",
            object_type="User Sky Coordinate",
            ra_deg=ra,
            dec_deg=dec,
            ra_hms=ra_hms,
            dec_dms=dec_dms,
        )

    # 3. Query upstream CDS Sesame Name Resolver
    try:
        url = f"https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oI/SNV?{httpx.URL('', params={'q': q}).query.decode('utf-8')}"
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.get(
                f"https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oI/SNV?{q}",
                headers={"User-Agent": "AFTERLIGHT-Astronomical-API/1.0"},
            )
            if resp.status_code == 200:
                text = resp.text
                import re

                j_match = re.search(r"%J\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)", text)
                if j_match:
                    ra_deg = float(j_match.group(1))
                    dec_deg = float(j_match.group(2))
                    type_match = re.search(r"%C\.0\s+([^\n]+)", text)
                    obj_type = type_match.group(1).strip() if type_match else "SIMBAD / NED Resolved Target"
                    return TargetResolveResponse(
                        ok=True,
                        source="cds-sesame",
                        data_mode="live-archive",
                        name=q,
                        object_type=obj_type,
                        ra_deg=ra_deg,
                        dec_deg=dec_deg,
                        ra_hms=format_ra_hms(ra_deg),
                        dec_dms=format_dec_dms(dec_deg),
                    )
    except Exception as exc:
        logger.warning("CDS Sesame lookup for '%s' failed: %s", q, exc)

    return TargetResolveResponse(
        ok=False,
        source="resolver",
        data_mode="demonstration",
        name=q,
        error=f'Could not resolve "{q}" via public Sesame resolver. Select a preconfigured target or enter J2000 coordinates (e.g. "08h55m10.831s -07d14m42.53s").',
    )


def validate_coordinates(
    ra_input: str, dec_input: str, fov_arcmin: float
) -> CoordinateValidationResult:
    """Validate RA, Dec, and Field-of-View boundaries."""
    ra = parse_ra(ra_input)
    dec = parse_dec(dec_input)

    if ra is None or dec is None:
        return CoordinateValidationResult(
            is_valid=False,
            error="Invalid RA or Dec format. Use sexagesimal (e.g. 08h55m10.831s, -07d14m42.53s) or decimal degrees.",
        )

    if fov_arcmin < 0.5 or fov_arcmin > 180.0:
        return CoordinateValidationResult(
            is_valid=False,
            error=f"Field-of-view of {fov_arcmin}' is out of bounds (allowed: 0.5' to 180').",
        )

    return CoordinateValidationResult(
        is_valid=True,
        ra_deg=ra,
        dec_deg=dec,
        ra_hms=format_ra_hms(ra),
        dec_dms=format_dec_dms(dec),
    )

