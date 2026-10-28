"""Cosmic Time Machine: Multi-epoch observation tracking and proper motion propagation."""
from typing import List, Optional
from ..models.observation import (
    PropagatedEpoch,
    PropagateCoordinatesRequest,
    PropagateCoordinatesResponse,
    TimelineResponse,
)
from ..models.target import SkyCoordinates
from .astronomy import (
    angular_separation_arcsec,
    format_dec_dms,
    format_ra_hms,
    position_angle_deg,
    propagate_proper_motion,
)
from .targets import get_curated_target


def get_target_timeline(target_id: str) -> Optional[TimelineResponse]:
    """Retrieve chronologically ordered observation timeline for a target."""
    target = get_curated_target(target_id)
    if not target:
        return None

    sorted_epochs = sorted(target.epochs, key=lambda e: e.year_decimal)
    if sorted_epochs:
        baseline = sorted_epochs[-1].year_decimal - sorted_epochs[0].year_decimal
    else:
        baseline = 0.0

    return TimelineResponse(
        ok=True,
        target_id=target.id,
        target_name=target.name,
        catalog_designation=target.catalog_designation,
        epoch_count=len(sorted_epochs),
        baseline_years=round(baseline, 2),
        total_proper_motion_arcsec_yr=target.total_proper_motion_arcsec_yr,
        epochs=sorted_epochs,
    )


def compute_epoch_propagation(
    req: PropagateCoordinatesRequest,
) -> PropagateCoordinatesResponse:
    """Propagate celestial coordinates across requested epoch baselines."""
    total_pm = (
        (req.pm_ra_cosdec_mas_yr ** 2 + req.pm_dec_mas_yr ** 2) ** 0.5
    ) / 1000.0

    ref_ra = req.ra_deg
    ref_dec = req.dec_deg
    sorted_years = sorted(req.target_years)

    propagated_list: List[PropagatedEpoch] = []
    for yr in sorted_years:
        new_ra, new_dec = propagate_proper_motion(
            ref_ra,
            ref_dec,
            req.pm_ra_cosdec_mas_yr,
            req.pm_dec_mas_yr,
            req.reference_epoch_year,
            yr,
        )
        disp_arcsec = angular_separation_arcsec(ref_ra, ref_dec, new_ra, new_dec)

        # Approximate ISO date for decimal year
        base_year = int(yr)
        day_of_year = int((yr - base_year) * 365.25)
        date_iso = f"{base_year:04d}-06-15"

        propagated_list.append(
            PropagatedEpoch(
                year_decimal=round(yr, 2),
                date_iso=date_iso,
                ra_deg=round(new_ra, 6),
                dec_deg=round(new_dec, 6),
                ra_hms=format_ra_hms(new_ra),
                dec_dms=format_dec_dms(new_dec),
                displacement_arcsec=round(disp_arcsec, 3),
                displacement_mas=round(disp_arcsec * 1000.0, 1),
            )
        )

    # Position angle of proper motion vector
    pa = position_angle_deg(
        ref_ra,
        ref_dec,
        ref_ra + (req.pm_ra_cosdec_mas_yr / 3600000.0),
        ref_dec + (req.pm_dec_mas_yr / 3600000.0),
    )

    return PropagateCoordinatesResponse(
        ok=True,
        reference_position=SkyCoordinates(ra_deg=ref_ra, dec_deg=ref_dec),
        total_proper_motion_arcsec_yr=round(total_pm, 4),
        position_angle_deg=round(pa, 1),
        epochs=propagated_list,
    )

