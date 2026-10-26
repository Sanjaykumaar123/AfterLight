"""Pydantic schemas for astronomical targets and coordinates."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SkyCoordinates(BaseModel):
    """J2000 ICRS Celestial Coordinates in decimal degrees."""
    ra_deg: float = Field(..., ge=0.0, lt=360.0, description="Right Ascension in decimal degrees [0, 360)")
    dec_deg: float = Field(..., ge=-90.0, le=90.0, description="Declination in decimal degrees [-90, +90]")


class CoordinateValidationResult(BaseModel):
    """Validation report for an input coordinate pair."""
    is_valid: bool
    ra_deg: Optional[float] = None
    dec_deg: Optional[float] = None
    ra_hms: Optional[str] = None
    dec_dms: Optional[str] = None
    error: Optional[str] = None


class TargetCategory(str, Enum):
    RED_DWARF = "Red Dwarf"
    BROWN_DWARF_BINARY = "Brown Dwarf Binary"
    Y_TYPE_BROWN_DWARF = "Y-Type Brown Dwarf"
    T_TAURI_VARIABLE = "T Tauri Variable"
    MIRA_VARIABLE = "Mira Variable"
    REFERENCE_FIELD = "Reference Field"
    GALAXY = "Galaxy"
    UNKNOWN = "Unknown Object"


class ObservationEpochModel(BaseModel):
    """Single observation epoch metadata."""
    id: str
    date_iso: str
    year_decimal: float
    instrument: str
    wavelength_label: str
    band_number: int
    flux_multiplier: float = 1.0
    data_provenance: str = "Archival Survey Reference"
    notes: str = ""


class CelestialTargetModel(BaseModel):
    """Astronomical benchmark or catalog target."""
    id: str
    name: str
    catalog_designation: str
    category: str
    constellation: str
    ra_string: str
    dec_string: str
    ra_deg: float
    dec_deg: float
    distance_ly: str
    spectral_type: str
    spectral_profile: str
    pm_ra_cosdec_mas_yr: float
    pm_dec_mas_yr: float
    total_proper_motion_arcsec_yr: float
    reference_epoch_year: float
    scale_flux_mjy: float
    default_fov_arcmin: float
    short_description: str
    scientific_summary: str
    caption: str
    image_url: str
    image_attribution: str
    instrument_info: str
    data_source: str
    available_wavelengths: str
    epochs: List[ObservationEpochModel] = []
    related_ids: List[str] = []


class TargetResolveResponse(BaseModel):
    """Result of resolving an object name or coordinate pair."""
    ok: bool
    source: str
    data_mode: str = "live-archive"
    name: str
    object_type: Optional[str] = None
    ra_deg: Optional[float] = None
    dec_deg: Optional[float] = None
    ra_hms: Optional[str] = None
    dec_dms: Optional[str] = None
    error: Optional[str] = None


class TargetSearchResponse(BaseModel):
    """Result of querying the astronomical target catalog."""
    ok: bool
    count: int
    targets: List[CelestialTargetModel]
    error: Optional[str] = None

