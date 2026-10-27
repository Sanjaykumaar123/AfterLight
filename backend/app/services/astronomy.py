"""Scientific astronomical coordinate handling, WCS projection, and proper motion propagation.

Built using Astropy, PyERFA, and spherical trigonometry.
"""
import math
import re
from typing import Optional, Tuple
from astropy.wcs import WCS
import numpy as np


DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi
ARCSEC_PER_DEG = 3600.0
MAS_PER_DEG = 3600000.0


def normalize_ra_deg(ra_deg: float) -> float:
    """Normalize Right Ascension into [0, 360) degrees."""
    mod = ra_deg % 360.0
    return mod + 360.0 if mod < 0 else mod


def clamp_dec_deg(dec_deg: float) -> float:
    """Clamp Declination into [-90, +90] degrees."""
    return max(-90.0, min(90.0, dec_deg))


def parse_ra(input_str: str) -> Optional[float]:
    """Parse Right Ascension string in decimal degrees or sexagesimal HMS.
    
    Examples:
        - "133.795129"
        - "08h55m10.831s"
        - "08:55:10.831"
        - "08 55 10.831"
    """
    s = input_str.strip()
    if not s:
        return None

    # Decimal degrees
    try:
        val = float(s)
        return normalize_ra_deg(val)
    except ValueError:
        pass

    # Sexagesimal HMS
    match = re.match(
        r"^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:\s]\s*(\d{1,2}(?:\.\d+)?)\s*s?$",
        s,
        re.IGNORECASE,
    )
    if not match:
        return None

    hours = float(match.group(1))
    minutes = float(match.group(2))
    seconds = float(match.group(3))

    if not (0 <= hours < 24 and 0 <= minutes < 60 and 0 <= seconds < 60):
        return None

    ra_deg = (hours + minutes / 60.0 + seconds / 3600.0) * 15.0
    return normalize_ra_deg(ra_deg)


def parse_dec(input_str: str) -> Optional[float]:
    """Parse Declination string in decimal degrees or sexagesimal DMS.
    
    Examples:
        - "-7.245147"
        - "-07d14m42.53s"
        - "+04° 41' 36.1\""
        - "-07:14:42.53"
        - "-07 14 42.53"
    """
    s = input_str.strip()
    if not s:
        return None

    # Decimal degrees
    try:
        val = float(s)
        if -90.0 <= val <= 90.0:
            return val
        return None
    except ValueError:
        pass

    # Sexagesimal DMS
    match = re.match(
        r"^([+-])?\s*(\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m'′:\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s\"″]?$",
        s,
        re.IGNORECASE,
    )
    if not match:
        return None

    sign = -1.0 if match.group(1) == "-" else 1.0
    deg = float(match.group(2))
    arcmin = float(match.group(3))
    arcsec = float(match.group(4))

    if deg > 90.0 or arcmin >= 60.0 or arcsec >= 60.0:
        return None

    val = sign * (deg + arcmin / 60.0 + arcsec / 3600.0)
    if -90.0 <= val <= 90.0:
        return val
    return None


def parse_coordinate_pair(input_str: str) -> Optional[Tuple[float, float, str, str]]:
    """Parse a full coordinate pair string into (ra_deg, dec_deg, ra_hms, dec_dms).
    
    Accepts comma, semicolon, or space-separated RA and Dec.
    """
    s = input_str.strip()
    if not s:
        return None

    # Try comma/semicolon split
    delimiters = [",", ";"]
    for delim in delimiters:
        if delim in s:
            parts = [p.strip() for p in s.split(delim, 1)]
            ra = parse_ra(parts[0])
            dec = parse_dec(parts[1])
            if ra is not None and dec is not None:
                return (ra, dec, format_ra_hms(ra), format_dec_dms(dec))

    # Try matching sign separator (e.g. "08h55m10.8s -07d14m42.5s" or "133.79 -7.24")
    sign_match = re.search(r"(\s+[+-])", s)
    if sign_match:
        split_pos = sign_match.start(1)
        ra_part = s[:split_pos].strip()
        dec_part = s[split_pos:].strip()
        ra = parse_ra(ra_part)
        dec = parse_dec(dec_part)
        if ra is not None and dec is not None:
            return (ra, dec, format_ra_hms(ra), format_dec_dms(dec))

    # Whitespace split
    tokens = s.split()
    if len(tokens) == 2:
        ra = parse_ra(tokens[0])
        dec = parse_dec(tokens[1])
        if ra is not None and dec is not None:
            return (ra, dec, format_ra_hms(ra), format_dec_dms(dec))
    elif len(tokens) == 6:
        # e.g. "08 55 10.8 -07 14 42.5"
        ra_str = f"{tokens[0]}h {tokens[1]}m {tokens[2]}s"
        dec_str = f"{tokens[3]}d {tokens[4]}m {tokens[5]}s"
        ra = parse_ra(ra_str)
        dec = parse_dec(dec_str)
        if ra is not None and dec is not None:
            return (ra, dec, format_ra_hms(ra), format_dec_dms(dec))

    return None


def format_ra_hms(ra_deg: float) -> str:
    """Format decimal degrees into standard astronomical HMS string: 'HHh MMm SS.sss'."""
    norm = normalize_ra_deg(ra_deg)
    total_hours = norm / 15.0
    h = int(total_hours)
    rem_min = (total_hours - h) * 60.0
    m = int(rem_min)
    s = (rem_min - m) * 60.0
    return f"{h:02d}h {m:02d}m {s:06.3f}s"


def format_dec_dms(dec_deg: float) -> str:
    """Format decimal degrees into standard astronomical DMS string: '±DD° MM′ SS.ss″'."""
    sign = "+" if dec_deg >= 0 else "-"
    abs_dec = abs(dec_deg)
    d = int(abs_dec)
    rem_min = (abs_dec - d) * 60.0
    m = int(rem_min)
    s = (rem_min - m) * 60.0
    return f"{sign}{d:02d}° {m:02d}′ {s:05.2f}″"


def angular_separation_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Compute great-circle angular separation in arcseconds using Haversine formula."""
    phi1 = dec1 * DEG_TO_RAD
    phi2 = dec2 * DEG_TO_RAD
    delta_phi = (dec2 - dec1) * DEG_TO_RAD
    delta_lambda = (ra2 - ra1) * DEG_TO_RAD

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return c * RAD_TO_DEG * ARCSEC_PER_DEG


def position_angle_deg(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Compute astronomical position angle East of North from (ra1, dec1) to (ra2, dec2)."""
    phi1 = dec1 * DEG_TO_RAD
    phi2 = dec2 * DEG_TO_RAD
    delta_lambda = (ra2 - ra1) * DEG_TO_RAD

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    pa_rad = math.atan2(y, x)
    pa_deg = (pa_rad * RAD_TO_DEG) % 360.0
    return pa_deg


def propagate_proper_motion(
    ra_deg: float,
    dec_deg: float,
    pm_ra_cosdec_mas_yr: float,
    pm_dec_mas_yr: float,
    ref_epoch_year: float,
    target_epoch_year: float,
) -> Tuple[float, float]:
    """Propagate celestial coordinates over baseline using proper motion components."""
    dt = target_epoch_year - ref_epoch_year
    dec_rad = dec_deg * DEG_TO_RAD
    cos_dec = max(0.01, math.cos(dec_rad))

    delta_ra_deg = (pm_ra_cosdec_mas_yr * dt) / (cos_dec * MAS_PER_DEG)
    delta_dec_deg = (pm_dec_mas_yr * dt) / MAS_PER_DEG

    new_ra = normalize_ra_deg(ra_deg + delta_ra_deg)
    new_dec = clamp_dec_deg(dec_deg + delta_dec_deg)
    return (new_ra, new_dec)


def create_wcs(
    center_ra_deg: float,
    center_dec_deg: float,
    fov_arcmin: float,
    width: int = 512,
    height: int = 512,
) -> WCS:
    """Construct an Astropy WCS instance with gnomonic tangent projection (TAN)."""
    w = WCS(naxis=2)
    w.wcs.crpix = [width / 2.0 + 0.5, height / 2.0 + 0.5]
    pixel_scale_deg = (fov_arcmin / 60.0) / width
    # East is left (negative CDELT1) in standard astronomical plates
    w.wcs.cdelt = [-pixel_scale_deg, pixel_scale_deg]
    w.wcs.crval = [center_ra_deg, center_dec_deg]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.cunit = ["deg", "deg"]
    w.wcs.radesys = "ICRS"
    w.wcs.equinox = 2000.0
    return w


def wcs_to_pixel(
    ra_deg: float,
    dec_deg: float,
    width: int,
    height: int,
    center_ra_deg: float,
    center_dec_deg: float,
    fov_arcmin: float,
) -> Tuple[float, float]:
    """Convert celestial sky coordinates to viewer pixel coordinates (East-left, North-up)."""
    fov_deg = fov_arcmin / 60.0
    cos_dec = max(0.01, math.cos(center_dec_deg * DEG_TO_RAD))

    # Small field tangent plane
    dra = (ra_deg - center_ra_deg) * cos_dec
    # Wrap RA across 360/0 boundary
    if dra > 180.0:
        dra -= 360.0
    elif dra < -180.0:
        dra += 360.0

    ddec = dec_deg - center_dec_deg

    x = width / 2.0 - (dra / fov_deg) * width
    y = height / 2.0 - (ddec / fov_deg) * height
    return (x, y)


def pixel_to_wcs(
    px: float,
    py: float,
    width: int,
    height: int,
    center_ra_deg: float,
    center_dec_deg: float,
    fov_arcmin: float,
) -> Tuple[float, float]:
    """Convert viewer pixel coordinates back to celestial sky coordinates."""
    fov_deg = fov_arcmin / 60.0
    cos_dec = max(0.01, math.cos(center_dec_deg * DEG_TO_RAD))

    dra = -((px - width / 2.0) / width) * fov_deg
    ddec = -((py - height / 2.0) / height) * fov_deg

    ra = normalize_ra_deg(center_ra_deg + dra / cos_dec)
    dec = clamp_dec_deg(center_dec_deg + ddec)
    return (ra, dec)

