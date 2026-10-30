# AFTERLIGHT — Scientific Astronomical Backend

**An astronomical discovery platform designed for the NASA Space Apps Challenge 2026**
*Planet X and SPHEREx · Multi-Epoch Infrared Sky Exploration*

---

## 1. Executive Summary & Architecture

The **AFTERLIGHT** backend is a scientific, high-reliability Python application built with **FastAPI**, **Astropy**, **Photutils**, **Astroquery**, **NumPy**, **SciPy**, and **Pydantic**. It interfaces directly with NASA mission data archives (NASA/IPAC IRSA, CDS Strasbourg, ESA Gaia) to process multi-epoch astronomical observations, generate standards-compliant FITS products, run subpixel image difference analysis, compute 102-channel spectrophotometric models, and execute automated point-source moving candidate detection.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AFTERLIGHT SYSTEM ARCHITECTURE                  │
├────────────────────────────────┬───────────────────────────────────────┤
│    FRONTEND (React 19 + Vite)  │   AFTERLIGHT BACKEND (FastAPI 0.128)  │
│                                │                                       │
│  • Observation Explorer        │  • Target Search & CDS Sesame         │
│  • Cosmic Time Machine Panel   │  • NASA/IPAC IRSA SPHEREx TAP Engine  │
│  • Image Comparison Workbench  │  • Astropy FITS 4.0 WCS Pipeline      │
│  • 102-Band Wavelength Tool    │  • Image Alignment & Difference Engine│
│  • Discovery Radar & Review    │  • Photutils DAOStarFinder Detection  │
│                                │  • SQLite Candidate Metadata Store    │
└────────────────────────────────┴───────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │                 VERIFIED PUBLIC ARCHIVES                │
        │  • NASA/IPAC IRSA SPHEREx TAP (spherex.artifact/plane)  │
        │  • NASA/IPAC IRSA AllWISE Catalog (allwise_p3as_psd)    │
        │  • CDS Strasbourg Sesame & HiPS2FITS                    │
        │  • ESA Gaia DR3 Proper Motion Baseline                  │
        └─────────────────────────────────────────────────────────┘
```

---

## 2. Core Scientific Capabilities

### 1. Astronomical Target Search & Coordinate Validation
- **Object Resolution**: Resolves arbitrary celestial objects via local curated benchmark catalogs, sexagesimal coordinate parsers, and upstream **CDS Sesame** (querying SIMBAD, NED, and VizieR).
- **Coordinate Formats**: Full support for sexagesimal Right Ascension (HMS: `08h 55m 10.831s`, `08:55:10.831`) and Declination (DMS: `-07° 14′ 42.53″`, `-07:14:42.53`), as well as ICRS decimal degrees.
- **FoV & Astrometric Bounding**: Validates field-of-view angular sizes ($0.5′$ to $180′$), converting accurately between tangent-plane projections and celestial coordinates.

### 2. NASA/SPHEREx Mission Data Integration
- **Official Host**: NASA/IPAC Infrared Science Archive (IRSA).
- **Table Access Protocol (TAP)**: Formulates verified ADQL queries joining `spherex.artifact` and `spherex.plane` for Level-2 Spectral Image Multi-Extension FITS (MEF) cutouts.
- **Detector Coverage**: Models SPHEREx's six Linear Variable Filter (LVF) detector arrays (`SPHEREx-D1` through `SPHEREx-D6`) covering **0.75 µm to 5.00 µm** across **102 discrete channels**.
- **M101 Tutorial Reference**: Incorporates the official Caltech/IPAC IRSA SPHEREx cutouts tutorial dataset for Pinwheel Galaxy (M101) DR1/QR3 exposures.
- **Scientific Provenance**: Explicitly tracks data modes (`live-archive`, `tutorial-reference`, `demonstration`) ensuring no simulated data is ever masqueraded as actual flight observation.

### 3. Standards-Compliant FITS Image Processing
- **NASA FITS Standard 4.0**: Produces valid, standard 2880-byte block-aligned binary FITS files with IEEE-754 big-endian float32 arrays (`BITPIX = -32`).
- **World Coordinate System (WCS)**: Injects standard celestial WCS cards (`CTYPE1='RA---TAN'`, `CTYPE2='DEC--TAN'`, `CRPIX1/2`, `CRVAL1/2`, `CDELT1/2`, `RADESYS='ICRS'`, `EQUINOX=2000.0`).
- **Astronomical Stretching**: Applies astronomical dynamic range compression:
  - **Asinh**: Lupton et al. (2004) non-linear softening preserving core and faint halo features.
  - **ZScale**: IRAF ZScale algorithm via `astropy.visualization.ZScaleInterval`.
  - **Log**: Logarithmic scaling for high dynamic range fields.
  - **MinMax / Percentile**: Linear stretch with $0.5\% - 99.5\%$ outlier clipping.
- **Color Mapping**: Infrared false-color palettes informed by effective wavelength (cyan for near-IR, amber for mid-IR, crimson for $4.5–5.0$ µm thermal emission).

### 4. Cosmic Time Machine
- **Multi-Epoch Baselines**: Curated epochs spanning 2010 (WISE Cryogenic), 2014–2021 (NEOWISE Reactivation), and 2025–2026 (SPHEREx survey passes).
- **Proper Motion Propagation**: Implements rigorous astrometric proper motion calculations ($\mu_{\alpha}\cos\delta, \mu_{\delta}$) over arbitrary baseline intervals.
- **Frontend Playback**: Returns timestamped chronologically sorted frames for interactive time-lapse observation playback.

### 5. Image Comparison Engine
- **Astrometric Alignment**: Subpixel shift registration via `scipy.ndimage.shift` using nearest-boundary padding.
- **Signed Difference Imaging**: Calculates $I_{\text{diff}} = I_B - I_A$, isolating stationary flux variables from proper-motion displacements.
- **Noise & Residual Statistics**: Computes min/max difference, mean, $\sigma_{\text{diff}}$, and RMS residual, flagging statistically significant brightening ($+3.5\sigma$) and dimming ($-3.5\sigma$) pixels.
- **Blink Comparison**: Configures synchronized frame cycling with recommended blink intervals ($250–750$ ms).

### 6. Infrared Wavelength Explorer (102 SPHEREx Bands)
- **Spectral Bands**: Complete parameter table for SPHEREx Bands 1 through 102 across Arrays 1–6 ($R \approx 35$ to $130$).
- **Physical SED Models**:
  - `m-dwarf`: $T_{\text{eff}} \approx 3200\text{ K}$ with TiO absorption bands (Barnard's Star benchmark).
  - `t-dwarf`: $T_{\text{eff}} \approx 1100\text{ K}$ with deep methane ($\text{CH}_4$, $1.66$ & $3.3$ µm) and steam ($\text{H}_2\text{O}$) troughs (Epsilon Indi B).
  - `y-dwarf`: $T_{\text{eff}} \approx 250\text{ K}$ polar-cold substellar object glowing predominantly in Array 6 at $4.5–5.0$ µm (WISE 0855).
  - `t-tauri-dust`: Young pre-main sequence binary with disrupted circumstellar dust disks and ice mantles (RW Aurigae).
  - `mira-giant`: Pulsating asymptotic giant branch star with molecular envelope variations (R Draconis).
- **IRSA Cross-Match**: Integrated with NASA/IPAC IRSA AllWISE catalog queries (`allwise_p3as_psd`).

### 7. Discovery Radar (Moving-Object Candidate Pipeline)
- **Point-Source Extraction**: Powered by **Photutils** `DAOStarFinder` combined with Astropy `sigma_clipped_stats` for robust background estimation.
- **Astrometric Matching**: Matches stationary field stars within an empirical matching radius to compute alignment RMS.
- **Motion Characterization**: Calculates angular displacement ($\Delta\theta$), proper motion ($\mu$ in arcsec/year), and position angle ($\theta$ East of North).
- **Candidate Ranking & Human Review**: Ranks candidates based on astrometric significance and SNR, distinguishing real candidates from false positives.
- **Persistence**: Lightweight **SQLite** database stores human inspector review statuses (`Pending Review`, `Under Inspection`, `Matched Known Object`, `Rejected`) and notes.
- **Scientific Integrity Disclaimer**: Every candidate detection automatically carries the mandatory disclosure:
  > *"CANDIDATE DISCOVERY - UNCONFIRMED. Requires independent astrometric validation and follow-up catalog cross-matching. Not a confirmed astronomical discovery."*

### 8. Benchmark Test Targets
1. **Barnard's Star**: High-proper-motion red dwarf ($10.358\text{"/yr}$ northward).
2. **Epsilon Indi B**: Cold methane brown dwarf binary ($4.708\text{"/yr}$).
3. **WISE 0855**: Coldest known Y-dwarf ($250\text{ K}$, $8.146\text{"/yr}$, Planet X analog).
4. **RW Aurigae**: Classical young variable star with dust disk obscurations.
5. **R Draconis**: Mira-type pulsating giant star (photometric variable benchmark).
6. **SA 57**: North Galactic Pole reference field (single-epoch calibration standard).

---

## 3. REST API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status, UTC timestamp, and version |
| `GET` | `/api/targets/curated` | List all preconfigured curated benchmark targets |
| `GET` | `/api/targets/search` | Search targets by name, designation, or constellation |
| `GET` | `/api/targets/resolve` | Resolve object name via local catalog, coords, or CDS Sesame |
| `GET` | `/api/targets/validate` | Validate RA, Dec, and Field-of-View boundaries |
| `GET` | `/api/targets/{id}` | Full astronomical target record by slug identifier |
| `GET` | `/api/spherex/arrays` | List 6 SPHEREx detector arrays (min/max µm, resolution) |
| `GET` | `/api/spherex/bands` | List all 102 calibrated SPHEREx spectral channels |
| `GET` | `/api/spherex/bands/{n}` | Metadata for a single SPHEREx spectral band (1–102) |
| `GET` | `/api/spherex/cutouts` | Query IRSA SPHEREx TAP for Level-2 cutout exposures |
| `GET` | `/api/fits/cutout` | Archival HiPS2FITS or calibrated simulation preview cutout |
| `GET` | `/api/fits/preview` | Stretched PNG/JPEG preview from 2D astronomical array |
| `GET` | `/api/fits/metadata` | Extract FITS header cards, WCS solution, and flux statistics |
| `GET` | `/api/fits/export` | Download standard 2880-byte padded FITS product |
| `GET` | `/api/timeline/{id}` | Multi-epoch observation timeline for a celestial target |
| `POST` | `/api/timeline/propagate` | Propagate custom celestial coordinates across epochs |
| `GET` | `/api/timeline/epochs` | Standard benchmark observation epochs across missions |
| `POST` | `/api/comparison/diff` | Astrometric alignment, difference matrix, and preview data |
| `GET` | `/api/comparison/preview` | Convenience GET endpoint for image difference previews |
| `GET` | `/api/spectrum/bands` | Wavelength explorer 102-band metadata |
| `GET` | `/api/spectrum/{id}` | 102-band SED curve for curated target |
| `POST` | `/api/spectrum/sed` | Compute custom SED for profile and scale flux |
| `GET` | `/api/spectrum/irsa-allwise`| Query IRSA AllWISE point-source photometry cone |
| `POST` | `/api/radar/detect` | Run Photutils point-source moving candidate detection |
| `GET` | `/api/radar/candidates` | Retrieve moving candidates for given sky region and epochs |
| `PATCH` | `/api/radar/candidates/{id}`| Update candidate review status and inspector notes in SQLite |
| `GET` | `/api/sources` | Metadata on verified public archives (IRSA, CDS, Gaia) |
| `GET` | `/api/archive/*` | 100% backward-compatible proxies for existing frontend |

---

## 4. Setup and Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 20+ (for running the React frontend)

### Backend Installation

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Backend

```bash
# Run using the launcher script
python run.py

# Or run using Uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The interactive OpenAPI documentation is immediately accessible at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Running the Test Suite

```bash
python -m pytest backend/tests -v
```

All 36 unit and integration tests run across coordinate parsing, WCS projection, proper motion propagation, FITS header validation, image difference computation, 102-band SED modeling, Photutils star extraction, SQLite persistence, and REST API endpoints.

---

## 5. Frontend Integration

The backend is engineered to connect cleanly to the existing AFTERLIGHT frontend without changing visual styles, component designs, or routing:

1. **Vite Proxy (Development)**:
   In `vite.config.ts`, all `/api` requests are proxied directly to `http://127.0.0.1:8000` (or `VITE_BACKEND_URL`).
2. **Backward Compatibility**:
   The `/api/archive/*` endpoints preserve the exact parameter names, data formats, and status codes expected by the React components.
3. **Environment Variable Configuration**:
   Set `VITE_BACKEND_URL` in `.env` to redirect frontend calls to any deployed instance.

---

## 6. Scientific Integrity & Data Provenance

1. **Clear Mode Differentiation**: Every response explicitly identifies whether data originates from `live-archive` (verified upstream call), `tutorial-reference` (Caltech/IPAC tutorial dataset), or `demonstration` (calibrated physical model).
2. **Never Fabricate Observations**: Observations from missions not yet archived are transparently designated as simulated passes using authentic Gaia DR3 astrometry and physical blackbody/dust models.
3. **Candidate Validation**: Candidate moving objects are flagged as unconfirmed candidates awaiting independent astrometric follow-up, preventing premature discovery claims.

