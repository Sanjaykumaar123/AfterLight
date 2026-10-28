"""Root-level launcher wrapper for the AFTERLIGHT backend.

Allows running `python run.py` directly from the workspace root.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from run import main

if __name__ == "__main__":
    main()

