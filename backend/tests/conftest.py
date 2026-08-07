from types import SimpleNamespace

import pytest
from fastapi import FastAPI

from backend.models import Place


@pytest.fixture
def make_place():
    """Factory fixture for building a Place with sensible defaults,
    overridable per-test. Keeps individual tests short — they only
    specify the fields that matter for what they're checking."""
    def _make_place(
        id="place_001",  # noqa: A002 - matches Place.id field name
        name="Test Place",
        type="restaurant",  # noqa: A002 - matches Place.type field name
        city="Florence",
        region="Tuscany",
        neighborhood=None,
        description="A test place.",
        latitude=43.7696,
        longitude=11.2558,
        hours=None,
        duration_minutes=60,
        price_range="$$",
        rating=4.5,
        tags=None,
        seasonal_notes=None,
        booking_required=None,
    ):
        return Place(
            id=id,
            name=name,
            type=type,
            city=city,
            region=region,
            neighborhood=neighborhood,
            description=description,
            latitude=latitude,
            longitude=longitude,
            hours=hours,
            duration_minutes=duration_minutes,
            price_range=price_range,
            rating=rating,
            tags=tags or [],
            seasonal_notes=seasonal_notes,
            booking_required=booking_required,
        )
    return _make_place


@pytest.fixture
def sample_places(make_place):
    """A small, geographically-spread, region-mixed set of places
    covering the hours-format variety seen in the real dataset (24h
    daytime, evening-only, null, vague text) — reused across route and
    utils tests that just need "a realistic working set" rather than
    a specific edge case."""
    return [
        make_place(
            id="place_001", name="Uffizi Gallery", region="Tuscany",
            city="Florence", latitude=43.7678, longitude=11.2553,
            hours="Tues-Sun 8:15-18:50",
        ),
        make_place(
            id="place_002", name="Piazzale Michelangelo", region="Tuscany",
            city="Florence", latitude=43.7629, longitude=11.2650,
            hours=None,
        ),
        make_place(
            id="place_003", name="Osteria dell'Enoteca", region="Tuscany",
            city="Florence", latitude=43.7700, longitude=11.2500,
            hours="Mon-Sat 19:30-22:30", type="restaurant",
        ),
        make_place(
            id="place_004", name="Siena Cathedral", region="Tuscany",
            city="Siena", latitude=43.3188, longitude=11.3308,
            hours="9:00-19:00",
        ),
        make_place(
            id="place_005", name="Colosseum", region="Lazio",
            city="Rome", latitude=41.8902, longitude=12.4922,
            hours="9:00-19:00",
        ),
        make_place(
            id="place_006", name="Trastevere Neighborhood", region="Lazio",
            city="Rome", latitude=41.8896, longitude=12.4695,
            hours="Evenings",
        ),
    ]


def make_tool_use_response(tool_name: str, input_dict: dict):
    """Build a duck-typed stand-in for an anthropic.types.Message whose
    content contains a single matching tool_use block — everything
    extract_tool_input actually reads (block.type, block.name,
    block.input). Used to mock client.messages.create without ever
    calling the real Anthropic API."""
    block = SimpleNamespace(type="tool_use", name=tool_name, input=input_dict)
    return SimpleNamespace(content=[block])


def build_test_app(router, places: list[Place]) -> FastAPI:
    """Build a minimal FastAPI app wrapping a single router, with
    app.state.places/known_regions set directly from a fixture list —
    bypasses the real lifespan (file loading/encoding-fix/validation),
    which is tested separately in test_main.py."""
    app = FastAPI()
    app.state.places = places
    app.state.known_regions = sorted({p.region for p in places})
    app.include_router(router)
    return app
