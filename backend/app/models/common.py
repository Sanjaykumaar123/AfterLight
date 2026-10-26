"""Common data types and response envelopes."""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DataProvenance(str, Enum):
    """Scientific data provenance and verification level."""
    LIVE_ARCHIVE = "live-archive"
    TUTORIAL_REFERENCE = "tutorial-reference"
    DEMONSTRATION = "demonstration"
    COORDINATE_PARSE = "coordinate-parse"
    CDS_SESAME = "cds-sesame"
    SIMBAD_ARCHIVE = "simbad-archive"
    NED_ARCHIVE = "ned-archive"


class StandardApiResponse(BaseModel):
    """Standardized API response wrapper."""
    ok: bool = Field(..., description="True if operation succeeded")
    data_mode: DataProvenance = Field(
        default=DataProvenance.DEMONSTRATION,
        description="Scientific provenance of returned data"
    )
    source: str = Field(..., description="Originating archive or simulator")
    message: Optional[str] = Field(default=None, description="Optional informational or error message")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")


class DataSourceInfo(BaseModel):
    """Metadata describing verified public astronomical archives used by AFTERLIGHT."""
    name: str
    organization: str
    access_protocol: str
    endpoint_url: str
    mission_description: str
    status: str
    coverage_bands: str

