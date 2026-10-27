"""Scientific FITS processing, WCS preservation, and astronomical image stretching.

Uses Astropy, PyERFA, SciPy, NumPy, and Pillow.
"""
import io
import math
from typing import Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
from astropy.io import fits
from astropy.visualization import AsinhStretch, LogStretch, MinMaxInterval, ZScaleInterval
import httpx
from .astronomy import create_wcs, DEG_TO_RAD
from .spherex import get_spherex_band
from ..models.fits import FitsHeaderCard, FitsMetadataResponse


def pad_fits_card(card: str) -> str:
    """Pad a FITS header card to standard 80 ASCII characters."""
    return card[:80].ljust(80, " ")


def build_fits_file_bytes(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float = 8.0,
    epoch_date: str = "2025-09-15",
    band_number: int = 62,
    target_name: str = "AFTERLIGHT_FIELD",
    width: int = 128,
    height: int = 128,
) -> bytes:
    """Generate standards-aligned NASA FITS 4.0 binary file with standard WCS headers."""
    band = get_spherex_band(band_number)
    pixel_scale_deg = (fov_arcmin / 60.0) / width

    # Synthesize scientific 2D Gaussian point-spread function field + sky background
    y_idx, x_idx = np.indices((height, width), dtype=np.float32)
    center_x = width / 2.0
    center_y = height / 2.0
    r2 = (x_idx - center_x) ** 2 + (y_idx - center_y) ** 2

    # Physical background in MJy/sr + target point source with Moffat-like wings
    background = 0.045 + 0.005 * np.sin(x_idx * 0.1) * np.cos(y_idx * 0.1)
    psf_core = 1.45 * np.exp(-r2 / 6.5)
    psf_wing = 0.20 * (1.0 + r2 / 12.0) ** (-1.8)
    data = (background + psf_core + psf_wing).astype(np.float32)

    # Use astropy.io.fits to ensure 100% compliance with NASA FITS Standard 4.0
    hdu = fits.PrimaryHDU(data=data)
    header = hdu.header

    # Target & Telescope metadata
    header["OBJECT"] = (target_name[:20], "Target identifier")
    header["TELESCOP"] = ("SPHEREx-Sim", "NASA SPHEREx all-sky spectral surveyor")
    header["INSTRUME"] = ("SPHEREx-LVF", "Linear Variable Filter Spectrophotometer")
    header["DATE-OBS"] = (epoch_date[:19], "Observation epoch UTC")
    header["BANDNUM"] = (band.band_number, "SPHEREx band number (1-102)")
    header["ARRAYID"] = (band.array_id, "Detector array index (1-6)")
    header["WAVELEN"] = (round(band.wavelengthUm if hasattr(band, 'wavelengthUm') else band.wavelength_um, 4), "Effective wavelength (micron)")
    header["BANDWID"] = (round(band.bandwidthUm if hasattr(band, 'bandwidthUm') else band.bandwidth_um, 5), "Bandpass FWHM (micron)")
    header["RESOLV"] = (band.resolving_power, "Resolving power R = lambda/delta_lambda")
    header["BUNIT"] = ("MJy/sr", "Calibrated surface brightness unit")
    header["DATAMODE"] = ("DEMONSTRATION", "Calibrated archival/demonstration cutout")
    header["ORIGIN"] = ("AFTERLIGHT 2026", "NASA Space Apps Challenge Discovery Platform")

    # Standard WCS astrometry cards (TAN Gnomonic projection)
    header["RADESYS"] = ("ICRS", "Coordinate reference frame")
    header["EQUINOX"] = (2000.0, "Equinox of celestial coordinates")
    header["CTYPE1"] = ("RA---TAN", "Gnomonic tangent projection")
    header["CTYPE2"] = ("DEC--TAN", "Gnomonic tangent projection")
    header["CRPIX1"] = (center_x + 0.5, "Reference pixel X (center)")
    header["CRPIX2"] = (center_y + 0.5, "Reference pixel Y (center)")
    header["CRVAL1"] = (round(ra_deg, 6), "Right Ascension at ref pixel (deg)")
    header["CRVAL2"] = (round(dec_deg, 6), "Declination at ref pixel (deg)")
    header["CDELT1"] = (-pixel_scale_deg, "Pixel scale X (deg/pix, East left)")
    header["CDELT2"] = (pixel_scale_deg, "Pixel scale Y (deg/pix, North up)")

    buf = io.BytesIO()
    hdu.writeto(buf, overwrite=True)
    return buf.getvalue()


def parse_fits_metadata(fits_bytes: bytes, filename: str = "cutout.fits") -> FitsMetadataResponse:
    """Read a FITS file buffer and extract full scientific header, WCS and image statistics."""
    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        primary = hdul[0]
        header = primary.header
        data = primary.data

        if data is None and len(hdul) > 1:
            primary = hdul[1]
            header = primary.header
            data = primary.data

        cards = [
            FitsHeaderCard(
                keyword=str(k),
                value=str(v),
                comment=str(header.comments[k]) if k in header.comments else None,
            )
            for k, v in header.items()
            if k and not k.startswith("COMMENT") and not k.startswith("HISTORY")
        ]

        data_arr = np.asarray(data, dtype=np.float64) if data is not None else np.zeros((1, 1))
        valid = data_arr[np.isfinite(data_arr)]
        if valid.size == 0:
            valid = np.array([0.0])

        return FitsMetadataResponse(
            ok=True,
            filename=filename,
            data_mode=str(header.get("DATAMODE", "demonstration")),
            naxis1=int(header.get("NAXIS1", data_arr.shape[1] if data_arr.ndim == 2 else 0)),
            naxis2=int(header.get("NAXIS2", data_arr.shape[0] if data_arr.ndim == 2 else 0)),
            bitpix=int(header.get("BITPIX", -32)),
            ctype1=str(header.get("CTYPE1", "RA---TAN")),
            ctype2=str(header.get("CTYPE2", "DEC--TAN")),
            crval1=float(header.get("CRVAL1", 0.0)),
            crval2=float(header.get("CRVAL2", 0.0)),
            crpix1=float(header.get("CRPIX1", 0.0)),
            crpix2=float(header.get("CRPIX2", 0.0)),
            cdelt1=float(header.get("CDELT1", -0.001)),
            cdelt2=float(header.get("CDELT2", 0.001)),
            equinox=float(header.get("EQUINOX", 2000.0)),
            radesys=str(header.get("RADESYS", "ICRS")),
            date_obs=str(header.get("DATE-OBS", "2025-01-01")),
            instrument=str(header.get("INSTRUME", "SPHEREx")),
            band_number=int(header["BANDNUM"]) if "BANDNUM" in header else None,
            wavelength_um=float(header["WAVELEN"]) if "WAVELEN" in header else None,
            min_flux=float(np.min(valid)),
            max_flux=float(np.max(valid)),
            mean_flux=float(np.mean(valid)),
            std_flux=float(np.std(valid)),
            cards=cards[:64],
        )


def apply_astronomical_stretch(
    image_data: np.ndarray,
    stretch_type: str = "asinh",
    contrast: float = 1.0,
    brightness: float = 0.0,
) -> np.ndarray:
    """Apply standard astronomical stretching (ZScale, Asinh, Log, MinMax) to 2D array."""
    data = np.nan_to_num(image_data.astype(np.float64), nan=0.0, posinf=1.0, neginf=0.0)

    if stretch_type == "zscale":
        interval = ZScaleInterval()
        try:
            vmin, vmax = interval.get_limits(data)
        except Exception:
            vmin, vmax = np.percentile(data, (1.0, 99.0))
        stretched = np.clip((data - vmin) / max(1e-6, vmax - vmin), 0.0, 1.0)
    elif stretch_type == "log":
        interval = MinMaxInterval()
        vmin, vmax = np.percentile(data, (0.5, 99.5))
        norm = np.clip((data - vmin) / max(1e-6, vmax - vmin), 0.0, 1.0)
        stretch = LogStretch(a=1000.0)
        stretched = stretch(norm)
    else:
        # Default: asinh stretch (Lupton et al.)
        vmin = np.percentile(data, 1.0)
        vmax = np.percentile(data, 99.5)
        norm = np.clip((data - vmin) / max(1e-6, vmax - vmin), 0.0, 1.0)
        stretch = AsinhStretch(a=0.1)
        stretched = stretch(norm)

    # Apply brightness offset and contrast slope
    adjusted = (stretched - 0.5) * contrast + 0.5 + brightness
    return np.clip(adjusted, 0.0, 1.0)


def array_to_preview_image(
    data: np.ndarray,
    wavelength_um: float = 2.2,
    stretch_type: str = "asinh",
    is_difference: bool = False,
    diff_intensity: float = 2.2,
    brightness: float = 0.0,
    contrast: float = 1.0,
    img_format: str = "PNG",
) -> bytes:
    """Render a stretched 2D float array into browser-compatible PNG/JPEG bytes."""
    h, w = data.shape

    if is_difference:
        # Diverging difference stretch centered at zero:
        # Negative (fading/vacated) = Cyan/Blue, Positive (brightening/new) = Orange/Amber
        scaled = np.clip(data * diff_intensity, -1.0, 1.0)
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        # Negative difference -> Cyan
        neg_mask = scaled < 0
        neg_mag = -scaled[neg_mask]
        rgb[neg_mask, 0] = (20 + 20 * (1.0 - neg_mag)).astype(np.uint8)
        rgb[neg_mask, 1] = (100 + 155 * neg_mag).astype(np.uint8)
        rgb[neg_mask, 2] = (180 + 75 * neg_mag).astype(np.uint8)

        # Positive difference -> Orange/Amber
        pos_mask = scaled > 0
        pos_mag = scaled[pos_mask]
        rgb[pos_mask, 0] = (180 + 75 * pos_mag).astype(np.uint8)
        rgb[pos_mask, 1] = (90 + 130 * pos_mag).astype(np.uint8)
        rgb[pos_mask, 2] = (20 * (1.0 - pos_mag)).astype(np.uint8)

        # Zero difference -> Dark slate
        zero_mask = scaled == 0
        rgb[zero_mask] = [15, 18, 25]
    else:
        stretched = apply_astronomical_stretch(data, stretch_type, contrast, brightness)

        # Infrared wavelength-informed false-color mapping:
        # Short NIR (0.75-1.1 um): Cool Cyan
        # Mid NIR (1.1-2.5 um): Warm Emerald/Gold
        # Thermal IR (2.5-5.0 um): Crimson/Amber
        if wavelength_um < 1.15:
            r_scale, g_scale, b_scale = 0.45, 0.78, 1.05
        elif wavelength_um < 2.0:
            r_scale, g_scale, b_scale = 0.70, 0.95, 0.85
        elif wavelength_um < 3.5:
            r_scale, g_scale, b_scale = 1.05, 0.82, 0.45
        else:
            r_scale, g_scale, b_scale = 1.15, 0.55, 0.35

        r = np.clip(stretched * r_scale * 255.0, 0, 255).astype(np.uint8)
        g = np.clip(stretched * g_scale * 255.0, 0, 255).astype(np.uint8)
        b = np.clip(stretched * b_scale * 255.0, 0, 255).astype(np.uint8)
        rgb = np.stack([r, g, b], axis=-1)

    img = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    fmt = "JPEG" if img_format.upper() in {"JPG", "JPEG"} else "PNG"
    img.save(buf, format=fmt, quality=92 if fmt == "JPEG" else None)
    return buf.getvalue()


async def fetch_archive_cutout(
    ra_deg: float,
    dec_deg: float,
    fov_arcmin: float = 8.0,
    survey: str = "CDS/P/allWISE/color",
    timeout_sec: float = 4.0,
) -> Tuple[Optional[bytes], str, str]:
    """Fetch live archival cutout from CDS HiPS2FITS or return fallback simulation bytes."""
    allowed_surveys = {"CDS/P/allWISE/color", "CDS/P/2MASS/color", "CDS/P/DSS2/color"}
    hips_id = survey if survey in allowed_surveys else "CDS/P/allWISE/color"
    fov_deg = max(0.016, min(2.0, fov_arcmin / 60.0))

    try:
        url = (
            f"https://alasky.cds.unistra.fr/hips-to-fits/fits?"
            f"hips={httpx.URL('', params={'h': hips_id}).query.decode('utf-8')[2:]}"
            f"&width=512&height=512&fov={fov_deg:.5f}&projection=TAN&coordsys=icrs"
            f"&ra={ra_deg:.6f}&dec={dec_deg:.6f}&format=jpg"
        )
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "AFTERLIGHT-Astronomical-API/1.0"},
            )
            content_type = resp.headers.get("content-type", "")
            if resp.status_code == 200 and content_type.startswith("image/"):
                return (resp.content, content_type, "live-archive")
    except Exception as exc:
        logger.warning("CDS HiPS2FITS cutout request failed: %s", exc)

    # Calibrated fallback preview
    demo_fits = build_fits_file_bytes(
        ra_deg=ra_deg,
        dec_deg=dec_deg,
        fov_arcmin=fov_arcmin,
        epoch_date="2025-09-15",
        band_number=62,
        target_name="AFTERLIGHT_FIELD",
        width=512,
        height=512,
    )
    with fits.open(io.BytesIO(demo_fits)) as hdul:
        data = hdul[0].data
        preview_bytes = array_to_preview_image(data, wavelength_um=3.4, stretch_type="asinh")
        return (preview_bytes, "image/png", "demonstration")

