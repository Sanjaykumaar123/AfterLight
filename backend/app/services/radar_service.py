"""Discovery Radar: Point source extraction via Photutils, cross-matching, and candidate ranking."""
import logging
import math
from typing import Dict, List, Optional, Tuple
import numpy as np
from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder
from ..models.radar import (
    DetectedSourceModel,
    MovingCandidateModel,
    RadarDetectionRequest,
    RadarDetectionResponse,
    ReviewStatus,
)
from .astronomy import (
    angular_separation_arcsec,
    format_dec_dms,
    format_ra_hms,
    pixel_to_wcs,
    position_angle_deg,
)
from .database import get_candidate_reviews
from .sky_generator import render_simulated_field
from .targets import get_curated_target

logger = logging.getLogger(__name__)

SCIENTIFIC_DISCLAIMER = (
    "CANDIDATE DISCOVERY - UNCONFIRMED. Requires independent astrometric validation "
    "and follow-up catalog cross-matching. Not a confirmed astronomical discovery."
)


def extract_point_sources_photutils(
    buffer: np.ndarray,
    center_ra_deg: float,
    center_dec_deg: float,
    fov_arcmin: float,
    snr_threshold: float = 5.0,
    width: int = 256,
    height: int = 256,
) -> List[DetectedSourceModel]:
    """Detect 2D astronomical point sources using Astropy sigma clipping and Photutils DAOStarFinder."""
    mean_val, median_val, std_val = sigma_clipped_stats(buffer, sigma=3.0)
    std_val = max(1e-4, float(std_val))

    daofind = DAOStarFinder(fwhm=3.0, threshold=snr_threshold * std_val)
    sources_tbl = daofind(buffer - median_val)

    detected: List[DetectedSourceModel] = []
    if sources_tbl is None or len(sources_tbl) == 0:
        return detected

    for idx, row in enumerate(sources_tbl):
        px = float(row["x_centroid"] if "x_centroid" in row.colnames else row["xcentroid"])
        py = float(row["y_centroid"] if "y_centroid" in row.colnames else row["ycentroid"])
        peak = float(row["peak"])
        flux = float(row["flux"]) if "flux" in row.colnames else peak * 4.5
        snr = float(peak / std_val)

        ra, dec = pixel_to_wcs(px, py, width, height, center_ra_deg, center_dec_deg, fov_arcmin)
        detected.append(
            DetectedSourceModel(
                id=f"SRC-{idx + 1}",
                x=round(px, 2),
                y=round(py, 2),
                peak_flux=round(peak, 4),
                integrated_flux=round(flux, 4),
                snr=round(snr, 1),
                ra_deg=round(ra, 6),
                dec_deg=round(dec, 6),
            )
        )

    return detected


def run_discovery_radar(
    req: RadarDetectionRequest,
    width: int = 256,
    height: int = 256,
) -> RadarDetectionResponse:
    """Run dual-epoch point source extraction, static matching, and moving candidate detection."""
    target = get_curated_target(req.target_id) if req.target_id else None

    # 1. Render calibrated dual-epoch fields
    buffer_a = render_simulated_field(
        center_ra_deg=req.ra_deg,
        center_dec_deg=req.dec_deg,
        fov_arcmin=req.fov_arcmin,
        epoch_year=req.epoch_a_year,
        band_number=req.band_number,
        target=target,
        include_synthetic_mover=req.include_synthetic_mover or (target is None),
        width=width,
        height=height,
    )

    buffer_b = render_simulated_field(
        center_ra_deg=req.ra_deg,
        center_dec_deg=req.dec_deg,
        fov_arcmin=req.fov_arcmin,
        epoch_year=req.epoch_b_year,
        band_number=req.band_number,
        target=target,
        include_synthetic_mover=req.include_synthetic_mover or (target is None),
        width=width,
        height=height,
    )

    # 2. Extract point sources with Photutils DAOStarFinder
    sources_a = extract_point_sources_photutils(
        buffer_a,
        req.ra_deg,
        req.dec_deg,
        req.fov_arcmin,
        snr_threshold=req.snr_threshold,
        width=width,
        height=height,
    )
    sources_b = extract_point_sources_photutils(
        buffer_b,
        req.ra_deg,
        req.dec_deg,
        req.fov_arcmin,
        snr_threshold=req.snr_threshold,
        width=width,
        height=height,
    )

    # 3. Pairwise Astrometric Matching
    matched_a = set()
    matched_b = set()
    static_separations: List[float] = []

    # Find static reference stars (separation <= matching_radius_arcsec)
    for sa in sources_a:
        best_b = None
        min_sep = 999999.0
        for sb in sources_b:
            if sb.id in matched_b:
                continue
            sep = angular_separation_arcsec(sa.ra_deg, sa.dec_deg, sb.ra_deg, sb.dec_deg)
            if sep < min_sep:
                min_sep = sep
                best_b = sb

        if best_b is not None and min_sep <= req.matching_radius_arcsec:
            matched_a.add(sa.id)
            matched_b.add(best_b.id)
            static_separations.append(min_sep)

    # Calculate empirical astrometric RMS from static stars
    if static_separations:
        rms_arcsec = float(np.sqrt(np.mean(np.array(static_separations) ** 2)))
    else:
        rms_arcsec = 0.08

    # 4. Identify Displaced Moving Object Candidates
    unmatched_a = [s for s in sources_a if s.id not in matched_a]
    unmatched_b = [s for s in sources_b if s.id not in matched_b]

    candidates: List[MovingCandidateModel] = []
    used_unmatched_b = set()
    dt_years = max(0.01, abs(req.epoch_b_year - req.epoch_a_year))

    # Read persistent review statuses from database
    db_reviews = get_candidate_reviews()

    candidate_idx = 1
    for sa in unmatched_a:
        # Match with candidate destination in Epoch B
        best_b = None
        best_sep = 999999.0

        for sb in unmatched_b:
            if sb.id in used_unmatched_b:
                continue
            sep = angular_separation_arcsec(sa.ra_deg, sa.dec_deg, sb.ra_deg, sb.dec_deg)
            # Acceptable candidate movement range: greater than astrometric threshold, up to max FOV
            if 0.3 <= sep <= (req.fov_arcmin * 60.0):
                if sep < best_sep:
                    best_sep = sep
                    best_b = sb

        if best_b is not None:
            used_unmatched_b.add(best_b.id)
            cand_id = f"CAND-{candidate_idx:02d}"
            candidate_idx += 1

            disp_px = float(math.sqrt((best_b.x - sa.x) ** 2 + (best_b.y - sa.y) ** 2))
            disp_arcsec = best_sep
            proper_motion = disp_arcsec / dt_years
            pa = position_angle_deg(sa.ra_deg, sa.dec_deg, best_b.ra_deg, best_b.dec_deg)

            # Confidence scoring
            significance = min(3.0, disp_arcsec / max(0.02, rms_arcsec * 2.0))
            snr_weight = min(1.0, (sa.snr + best_b.snr) / 30.0)
            confidence = round(min(0.98, max(0.40, 0.5 * significance / 3.0 + 0.3 * snr_weight + 0.2)), 2)

            # Classification Note
            if target and disp_arcsec > 0.5:
                note = f"Matched Known Target: {target.name} (Astrometric Proper Motion Benchmark)"
                status = ReviewStatus.MATCHED_KNOWN_OBJECT
            elif proper_motion >= 1.0:
                note = f"Fast Mover Candidate (μ = {proper_motion:.2f}\"/yr, PA = {pa:.0f}°)"
                status = ReviewStatus.PENDING_REVIEW
            else:
                note = f"Moderate Proper Motion Candidate (μ = {proper_motion:.3f}\"/yr)"
                status = ReviewStatus.PENDING_REVIEW

            # Apply review status from database if user previously inspected/updated it
            if cand_id in db_reviews:
                status = ReviewStatus(db_reviews[cand_id].get("review_status", status.value))

            candidates.append(
                MovingCandidateModel(
                    candidate_id=cand_id,
                    ra_deg=round(best_b.ra_deg, 6),
                    dec_deg=round(best_b.dec_deg, 6),
                    ra_hms=format_ra_hms(best_b.ra_deg),
                    dec_dms=format_dec_dms(best_b.dec_deg),
                    epoch_a_date=req.epoch_a_date,
                    epoch_b_date=req.epoch_b_date,
                    displacement_arcsec=round(disp_arcsec, 3),
                    displacement_px=round(disp_px, 1),
                    proper_motion_arcsec_yr=round(proper_motion, 4),
                    position_angle_deg=round(pa, 1),
                    snr_epoch_a=round(sa.snr, 1),
                    snr_epoch_b=round(best_b.snr, 1),
                    confidence=confidence,
                    review_status=status,
                    epoch_a_pos={"x": sa.x, "y": sa.y},
                    epoch_b_pos={"x": best_b.x, "y": best_b.y},
                    classification_note=note,
                    scientific_disclaimer=SCIENTIFIC_DISCLAIMER,
                )
            )

    # Sort candidates by confidence descending
    candidates.sort(key=lambda c: c.confidence, reverse=True)

    return RadarDetectionResponse(
        ok=True,
        epoch_a_source_count=len(sources_a),
        epoch_b_source_count=len(sources_b),
        matched_static_count=len(matched_a),
        astrometric_rms_arcsec=round(rms_arcsec, 4),
        candidate_count=len(candidates),
        candidates=candidates,
        scientific_disclaimer=SCIENTIFIC_DISCLAIMER,
    )
