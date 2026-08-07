from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models import Place
from backend.routes.selection.routes import router as selection_router
from backend.routes.itinerary.routes import router as itinerary_router
from backend.preprocessing import fix_encoding_corruption_deep

DATA_PATH = Path(__file__).parent / "data" / "italy.json"


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """
    Load and validate italy.json once at application startup, storing the
    parsed places on app.state so route handlers can read them without
    re-reading or re-parsing the file on every request.

    Args:
        fastapi_app (FastAPI): The FastAPI application instance being started.
    """
    with open(DATA_PATH, encoding="utf-8") as f:
        raw = json.load(f)

    # NOTE: This is required because the raw italy.json data has corrupted fields (i.e. price_range, description)
    raw = fix_encoding_corruption_deep(raw)
    # Define these once at startup so route handlers can access them without re-reading the file on every request
    fastapi_app.state.places = [Place.model_validate(p) for p in raw]
    fastapi_app.state.known_regions = sorted({p.region for p in fastapi_app.state.places})
    yield
    # no teardown needed


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # TODO: add deployed frontend origin when it's time to host app
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(selection_router)
app.include_router(itinerary_router)
