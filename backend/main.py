from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import Place
from routes import router

DATA_PATH = Path(__file__).parent / "data" / "italy.json"


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """
    Load and validate italy.json once at application startup, storing the
    parsed places on app.state so route handlers can read them without
    re-reading or re-parsing the file on every request.
    """
    # TODO: apply the encoding fix here on load (re-decode/normalize),
    # not per-request, so garbled characters are corrected once at startup.
    with open(DATA_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    fastapi_app.state.places = [Place.model_validate(p) for p in raw]
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

app.include_router(router)
