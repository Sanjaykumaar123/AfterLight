"""Lightweight SQLite database for candidate reviews and persistent state."""
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional
from ..config import settings


def init_db(db_path: Optional[Path] = None):
    """Initialize SQLite database schema for candidate reviews."""
    path = db_path or settings.DATABASE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS candidate_reviews (
                candidate_id TEXT PRIMARY KEY,
                target_id TEXT,
                ra_deg REAL,
                dec_deg REAL,
                epoch_a_date TEXT,
                epoch_b_date TEXT,
                displacement_arcsec REAL,
                proper_motion_arcsec_yr REAL,
                review_status TEXT,
                notes TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def save_candidate_review(
    candidate_id: str,
    review_status: str,
    notes: Optional[str] = None,
    target_id: Optional[str] = None,
    ra_deg: Optional[float] = None,
    dec_deg: Optional[float] = None,
    epoch_a_date: Optional[str] = None,
    epoch_b_date: Optional[str] = None,
    displacement_arcsec: Optional[float] = None,
    proper_motion_arcsec_yr: Optional[float] = None,
    db_path: Optional[Path] = None,
):
    """Upsert candidate review status and human inspector notes."""
    path = db_path or settings.DATABASE_PATH
    init_db(path)

    with sqlite3.connect(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO candidate_reviews (
                candidate_id, target_id, ra_deg, dec_deg,
                epoch_a_date, epoch_b_date, displacement_arcsec,
                proper_motion_arcsec_yr, review_status, notes, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(candidate_id) DO UPDATE SET
                review_status=excluded.review_status,
                notes=coalesce(excluded.notes, candidate_reviews.notes),
                updated_at=CURRENT_TIMESTAMP
            """,
            (
                candidate_id,
                target_id,
                ra_deg,
                dec_deg,
                epoch_a_date,
                epoch_b_date,
                displacement_arcsec,
                proper_motion_arcsec_yr,
                review_status,
                notes,
            ),
        )
        conn.commit()


def get_candidate_reviews(db_path: Optional[Path] = None) -> Dict[str, Dict]:
    """Retrieve all candidate review overrides from database."""
    path = db_path or settings.DATABASE_PATH
    if not path.exists():
        return {}

    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM candidate_reviews")
        rows = cursor.fetchall()
        return {r["candidate_id"]: dict(r) for r in rows}

