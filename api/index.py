"""
Vercel's Python runtime auto-detects an ASGI `app` in files under /api.
Re-exports the real FastAPI app from backend/main.py rather than
duplicating it, so there's exactly one app definition either way.
"""

from backend.main import app  # noqa: F401  (Vercel's runtime detects this module-level `app`)

__all__ = ["app"]
