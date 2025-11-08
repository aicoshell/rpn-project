# Vercel FastAPI entrypoint
# Expose the FastAPI application object as `app`
import os
import sys

# Ensure repository root is on sys.path so `backend.app.main` can be imported
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(_THIS_DIR)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from backend.app.main import app  # FastAPI instance
