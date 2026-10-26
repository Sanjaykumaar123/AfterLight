"""Application configuration using Pydantic Settings."""
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Runtime configuration for AFTERLIGHT backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "AFTERLIGHT Astronomical Discovery API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # CORS configuration
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "*",
        ]
    )

    # Timeouts for public astronomical archives (CDS, IRSA)
    UPSTREAM_TIMEOUT_SEC: float = 4.5

    # Storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATABASE_PATH: Path = BASE_DIR / "data" / "afterlight.db"
    CACHE_DIR: Path = BASE_DIR / "data" / "cache"


settings = Settings()

