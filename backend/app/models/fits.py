"""Pydantic schemas for FITS metadata, processing, and cutouts."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FitsHeaderCard(BaseModel):
    """Single standard FITS 80-character header record."""
    keyword: str
    value: Any
    comment: Optional[str] = None


class FitsMetadataResponse(BaseModel):
    """Extracted scientific FITS metadata and WCS solution."""
    ok: bool
    filename: str
    data_mode: str = "demonstration"
    naxis1: int
    naxis2: int
    bitpix: int
    ctype1: str
    ctype2: str
    crval1: float
    crval2: float
    crpix1: float
    crpix2: float
    cdelt1: float
    cdelt2: float
    equinox: float = 2000.0
    radesys: str = "ICRS"
    date_obs: str
    instrument: str
    band_number: Optional[int] = None
    wavelength_um: Optional[float] = None
    min_flux: float
    max_flux: float
    mean_flux: float
    std_flux: float
    cards: List[FitsHeaderCard] = []


class FitsCutoutParams(BaseModel):
    """Parameters for generating or retrieving a FITS cutout."""
    ra: float = Field(..., ge=0.0, lt=360.0)
    dec: float = Field(..., ge=-90.0, le=90.0)
    fov_arcmin: float = Field(default=8.0, ge=1.0, le=120.0)
    survey: str = Field(default="CDS/P/allWISE/color")
    format: str = Field(default="jpeg")
    stretch: str = Field(default="asinh")
    colormap: str = Field(default="infrared")
    width: int = Field(default=512, ge=64, le=1024)
    height: int = Field(default=512, ge=64, le=1024)


class FitsExportParams(BaseModel):
    """Parameters for exporting standard FITS files."""
    ra: float = Field(..., ge=0.0, lt=360.0)
    dec: float = Field(..., ge=-90.0, le=90.0)
    fov_arcmin: float = Field(default=8.0, ge=1.0, le=60.0)
    epoch: str = Field(default="2025-09-15")
    band: int = Field(default=62, ge=1, le=102)
    target_name: str = Field(default="AFTERLIGHT_FIELD")

