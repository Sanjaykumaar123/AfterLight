"""Pydantic schemas for the 102 SPHEREx spectral channels and SED modeling."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SpherexDetectorArrayModel(BaseModel):
    """SPHEREx Linear Variable Filter (LVF) detector array metadata."""
    array_id: int
    name: str
    min_um: float
    max_um: float
    resolving_power: int
    band_start: int
    band_end: int
    primary_science_focus: str


class SpherexBandModel(BaseModel):
    """Metadata for one of the 102 calibrated SPHEREx spectral channels."""
    band_number: int
    array_id: int
    wavelength_um: float
    bandwidth_um: float
    resolving_power: int
    tracer_note: str


class SedPoint(BaseModel):
    """Calculated flux point across the SPHEREx spectrophotometric bandpass."""
    band_number: int
    wavelength_um: float
    flux_mjy: float
    array_id: int
    tracer_note: str
    is_feature: bool = False


class SedResponse(BaseModel):
    """Spectral Energy Distribution spanning 0.75 to 5.00 micrometers."""
    ok: bool
    target_name: str
    spectral_profile: str
    scale_flux_mjy: float
    data_mode: str = "demonstration"
    provenance: str
    molecular_features: List[str] = []
    points: List[SedPoint]


class SpherexCutoutRecordModel(BaseModel):
    """Record of an IRSA SPHEREx Level-2 cutout exposure."""
    index: int
    release: str
    obs_week: str
    exposure_id: str
    detector: str
    pipeline_version: str
    uri: str
    time_bounds_lower: Optional[Any] = None


class SpherexTapResponse(BaseModel):
    """Result of querying the NASA/IPAC IRSA SPHEREx TAP service."""
    ok: bool
    data_mode: str
    source: str
    adql: str
    rows: List[Dict[str, Any]]

