"""Verified public astronomical archives and data provenance metadata."""
from typing import List
from fastapi import APIRouter
from ..models.common import DataSourceInfo

router = APIRouter(prefix="/api/sources", tags=["Data Sources & Provenance"])

VERIFIED_SOURCES: List[DataSourceInfo] = [
    DataSourceInfo(
        name="NASA/IPAC Infrared Science Archive (IRSA) SPHEREx TAP",
        organization="NASA / Caltech / IPAC",
        access_protocol="IVOA Table Access Protocol (TAP) + ADQL",
        endpoint_url="https://irsa.ipac.caltech.edu/TAP/sync",
        mission_description=(
            "Official NASA mission archive for the SPHEREx all-sky spectrophotometric survey. "
            "Exposes spherex.artifact and spherex.plane metadata for Level-2 Spectral Image Cutouts."
        ),
        status="Verified Official Mission Archive",
        coverage_bands="0.75 – 5.00 µm across 102 channels (Arrays 1 to 6)",
    ),
    DataSourceInfo(
        name="NASA/IPAC IRSA AllWISE Catalog",
        organization="NASA / JPL-Caltech / IPAC",
        access_protocol="IVOA TAP sync query (allwise_p3as_psd)",
        endpoint_url="https://irsa.ipac.caltech.edu/TAP/sync",
        mission_description=(
            "All-sky infrared source catalog from NASA's Wide-field Infrared Survey Explorer (WISE) "
            "providing cryogenic 3.4 µm (W1), 4.6 µm (W2), 12 µm (W3), and 22 µm (W4) photometry."
        ),
        status="Verified Public Archive",
        coverage_bands="3.4 – 22.0 µm",
    ),
    DataSourceInfo(
        name="CDS Strasbourg Sesame Name Resolver",
        organization="Centre de Données astronomiques de Strasbourg (CDS)",
        access_protocol="HTTP REST (SNV)",
        endpoint_url="https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oI/SNV",
        mission_description=(
            "Astronomical target name resolution service cross-querying SIMBAD, NED, and VizieR "
            "to convert object designations into ICRS J2000 celestial coordinates."
        ),
        status="Verified Astronomical Service",
        coverage_bands="All-Sky Name Resolution",
    ),
    DataSourceInfo(
        name="CDS HiPS2FITS Sky Cutout Service",
        organization="Centre de Données astronomiques de Strasbourg (CDS)",
        access_protocol="HTTP FITS / JPEG cutout extraction",
        endpoint_url="https://alasky.cds.unistra.fr/hips-to-fits/fits",
        mission_description=(
            "Extracts standard FITS plates and color previews from all-sky Hierarchical Progressive Surveys "
            "(HiPS), including AllWISE, 2MASS, and DSS2."
        ),
        status="Verified Archival Cutout Service",
        coverage_bands="Optical, Near-IR (2MASS J/H/Ks), Mid-IR (AllWISE)",
    ),
    DataSourceInfo(
        name="ESA Gaia Data Release 3 (Gaia DR3)",
        organization="European Space Agency (ESA)",
        access_protocol="Astrometric catalog cross-match",
        endpoint_url="https://gea.esac.esa.int/archive/",
        mission_description=(
            "High-precision space astrometry providing positions, parallaxes, and proper motion vectors "
            "used to benchmark moving object detection algorithms."
        ),
        status="Verified Astrometric Benchmark",
        coverage_bands="Optical Astrometry (G, BP, RP)",
    ),
]


@router.get("", response_model=List[DataSourceInfo])
async def list_data_sources():
    """List all verified public astronomical datasets and integration protocols used by AFTERLIGHT."""
    return VERIFIED_SOURCES

