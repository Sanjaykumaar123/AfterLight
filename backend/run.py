"""Production launcher script for the AFTERLIGHT FastAPI Backend.

Handles Windows multiprocessing safely, disables aggressive OneDrive file watching,
restricts reload paths strictly to app/ when requested, and intercepts KeyboardInterrupt
cleanly.
"""
import argparse
import multiprocessing
import os
import sys
from pathlib import Path
import uvicorn

# Call freeze_support for Windows multiprocessing safety
if sys.platform.startswith("win"):
    multiprocessing.freeze_support()

# Ensure the backend directory is in the Python module search path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings


def main():
    parser = argparse.ArgumentParser(description="AFTERLIGHT Scientific Astronomical Backend")
    parser.add_argument("--host", default=os.environ.get("HOST", settings.HOST), help="Host to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", settings.PORT)), help="Port to bind (default: 8000)")
    parser.add_argument("--reload", action="store_true", default=os.environ.get("RELOAD", "false").lower() in ("true", "1"), help="Enable auto-reload on code change")
    args = parser.parse_args()

    print("=" * 72)
    print("  AFTERLIGHT — Astronomical Discovery Platform")
    print(f"  FastAPI Scientific Backend running on http://{args.host}:{args.port}")
    print(f"  Interactive OpenAPI Documentation: http://{args.host}:{args.port}/docs")
    print(f"  Auto-reload mode: {'ENABLED (watching backend/app)' if args.reload else 'DISABLED (stable single-process mode)'}")
    print("=" * 72)

    app_dir = backend_dir / "app"

    try:
        if args.reload:
            uvicorn.run(
                "app.main:app",
                host=args.host,
                port=args.port,
                reload=True,
                reload_dirs=[str(app_dir)],
                reload_excludes=["*.db", "*.sqlite*", "data/*", "*.log", "node_modules/*", ".git/*"],
                log_level=settings.LOG_LEVEL.lower(),
            )
        else:
            from app.main import app
            uvicorn.run(
                app,
                host=args.host,
                port=args.port,
                log_level=settings.LOG_LEVEL.lower(),
            )
    except KeyboardInterrupt:
        print("\n[INFO] AFTERLIGHT backend stopped gracefully.")
        sys.exit(0)


if __name__ == "__main__":
    main()
