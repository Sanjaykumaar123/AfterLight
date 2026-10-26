"""Pydantic schemas for observation epochs and Cosmic Time Machine."""
from typing import List, Optional
from pydantic import BaseModel, Field
from .target import ObservationEpochModel, SkyCoordinates


class PropagatedEpoch(BaseModel):
    """Calculated position of a target at a given epoch."""
    year_decimal: float
    date_iso: Optional[str] = None
    ra_deg: float
    dec_deg: float
    ra_hms: str
    dec_dms: str
    displacement_arcsec: float
    displacement_mas: float


class PropagateCoordinatesRequest(BaseModel):
    """Request to compute proper motion across arbitrary epoch baselines."""
    ra_deg: float
    dec_deg: float
    pm_ra_cosdec_mas_yr: float
    pm_dec_mas_yr: float
    reference_epoch_year: float = 2016.0
    target_years: List[float] = Field(..., min_length=1)


class PropagateCoordinatesResponse(BaseModel):
    """Response containing epoch-by-epoch propagated coordinates."""
    ok: bool
    reference_position: SkyCoordinates
    total_proper_motion_arcsec_yr: float
    position_angle_deg: float
    epochs: List[PropagatedEpoch]


class TimelineResponse(BaseModel):
    """Complete observation timeline for a celestial target."""
    ok: bool
    target_id: str
    target_name: str
    catalog_designation: str
    epoch_count: int
    baseline_years: float
    total_proper_motion_arcsec_yr: float
    epochs: List[ObservationEpochModel]

