"""Integration tests for all FastAPI endpoints using TestClient."""
import io
from astropy.io import fits
from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


def test_health_check():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["service"] == "afterlight-api"
    assert "timestamp" in data


def test_root_endpoint():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "AFTERLIGHT" in data["name"]
    assert data["status"] == "operational"


def test_targets_api():
    # Curated targets list
    resp_list = client.get("/api/targets/curated")
    assert resp_list.status_code == 200
    targets = resp_list.json()
    assert len(targets) >= 5

    # Target search
    resp_search = client.get("/api/targets/search?q=Barnard")
    assert resp_search.status_code == 200
    assert resp_search.json()["count"] >= 1

    # Target resolve
    resp_resolve = client.get("/api/targets/resolve?q=WISE%200855")
    assert resp_resolve.status_code == 200
    res_data = resp_resolve.json()
    assert res_data["ok"] is True
    assert res_data["ra_deg"] == pytest.approx(133.795, abs=0.01)

    # Specific target by id
    resp_single = client.get("/api/targets/wise-0855")
    assert resp_single.status_code == 200
    assert resp_single.json()["id"] == "wise-0855"


def test_spherex_api():
    # Arrays
    resp_arr = client.get("/api/spherex/arrays")
    assert resp_arr.status_code == 200
    assert len(resp_arr.json()) == 6

    # 102 bands
    resp_bands = client.get("/api/spherex/bands")
    assert resp_bands.status_code == 200
    assert len(resp_bands.json()) == 102

    # Single band
    resp_b62 = client.get("/api/spherex/bands/62")
    assert resp_b62.status_code == 200
    assert resp_b62.json()["band_number"] == 62


def test_fits_api():
    # Metadata
    resp_meta = client.get("/api/fits/metadata?ra=133.795&dec=-7.245&band=96")
    assert resp_meta.status_code == 200
    meta = resp_meta.json()
    assert meta["ok"] is True
    assert meta["naxis1"] > 0

    # FITS binary export
    resp_exp = client.get("/api/fits/export?ra=133.795&dec=-7.245&band=96&target_name=WISE0855")
    assert resp_exp.status_code == 200
    assert resp_exp.headers["content-type"] == "application/fits"
    assert len(resp_exp.content) % 2880 == 0
    with fits.open(io.BytesIO(resp_exp.content)) as hdul:
        assert hdul[0].header["OBJECT"] == "WISE0855"


def test_timeline_api():
    resp_tl = client.get("/api/timeline/barnards-star")
    assert resp_tl.status_code == 200
    data = resp_tl.json()
    assert data["ok"] is True
    assert data["epoch_count"] >= 4
    assert data["baseline_years"] > 10.0


def test_spectrum_api():
    resp_sed = client.get("/api/spectrum/wise-0855")
    assert resp_sed.status_code == 200
    data = resp_sed.json()
    assert data["ok"] is True
    assert len(data["points"]) == 102


def test_radar_and_sqlite_persistence():
    # Run radar detection
    detect_req = {
        "ra_deg": 269.452077,
        "dec_deg": 4.693365,
        "fov_arcmin": 8.0,
        "band_number": 62,
        "epoch_a_year": 2010.21,
        "epoch_b_year": 2025.71,
        "epoch_a_date": "2010-03-18",
        "epoch_b_date": "2025-09-15",
        "target_id": "barnards-star",
        "snr_threshold": 4.5,
    }
    resp_det = client.post("/api/radar/detect", json=detect_req)
    assert resp_det.status_code == 200
    det_data = resp_det.json()
    assert det_data["ok"] is True

    # Update candidate review status in SQLite
    update_req = {
        "review_status": "Under Inspection",
        "notes": "Verified northward proper motion against Gaia DR3 baseline.",
    }
    resp_patch = client.patch("/api/radar/candidates/CAND-01", json=update_req)
    assert resp_patch.status_code == 200
    assert resp_patch.json()["review_status"] == "Under Inspection"


def test_frontend_backward_compatibility():
    # 1. /api/archive/resolve
    resp_res = client.get("/api/archive/resolve?q=WISE%200855")
    assert resp_res.status_code == 200
    data_res = resp_res.json()
    assert data_res["ok"] is True
    assert "raDeg" in data_res
    assert "decDeg" in data_res

    # 2. /api/archive/irsa-catalog
    resp_cat = client.get("/api/archive/irsa-catalog?ra=133.795&dec=-7.245")
    assert resp_cat.status_code == 200
    data_cat = resp_cat.json()
    assert data_cat["ok"] is True
    assert "rows" in data_cat

    # 3. /api/archive/spherex-cutouts
    resp_spx = client.get("/api/archive/spherex-cutouts?ra=210.80227&dec=54.34895")
    assert resp_spx.status_code == 200
    data_spx = resp_spx.json()
    assert data_spx["ok"] is True
    assert "adql" in data_spx

    # 4. /api/archive/fits-export
    resp_fits = client.get("/api/archive/fits-export?ra=133.795&dec=-7.245&band=96")
    assert resp_fits.status_code == 200
    assert resp_fits.headers["content-type"] == "application/fits"
    assert len(resp_fits.content) % 2880 == 0

