"""
Pydantic models — backend contracts for the trip planner

Organized in four groups:
1. Core data model (mirrors italy.json)
2. Shared sub-models (reused across multiple endpoints)
3. Per-endpoint request/response pairs
4. Edge-case / non-happy-path response models
"""

from enum import Enum
from pydantic import (
    BaseModel,
    Field
)

class Place(BaseModel):
    """Mirrors a single entry in italy.json. Used to validate the dataset
    on load, so malformed entries surface at ingestion time, not at runtime"""

    id: str
    name: str
    type: str
    city: str
    region: str
    neighborhood: str | None = None
    description: str
    latitude: float
    longitude: float
    hours: str | None = None
    duration_minutes: int | None = None
    price_range: str
    rating: float
    tags: list[str] = Field(default_factory=list)
    seasonal_notes: str | None = None
    booking_required: bool = False


class BusyLevel(str, Enum):
    '''Controls how many places the LLM should select per day'''
    # 2-3 places/day
    CHILL = "chill"

    # 4-5 places/day
    BUSY = "busy"

    # 6+ places/day
    PACKED = "packed"


# Per day place count caps, keyed by BusyLevel. Single source of truth so
# the target count math (selection) and minimum count gate (approval) never
# drift out of sync with each other
BUSY_LEVEL_RANGE: dict[BusyLevel, tuple[int, int | None]] = {
    BusyLevel.CHILL: (2, 3),
    BusyLevel.BUSY: (4, 5),
    BusyLevel.PACKED: (6, None),
}

TRIP_LENGTH_DAYS = 3


class SelectedPlace(BaseModel):
    """A place chosen by the LLM, with its reasoning. Reused across the
    selection and refinement responses so the frontend renders both
    identically"""

    id: str
    reason: str


class PromptText(BaseModel):
    """Reusable prompt field with the shared 500-character limit, enforced
    server side regardless of frontend validation"""

    text: str = Field(..., max_length=500, min_length=1)


# POST /select

class SelectionRequest(BaseModel):
    """Request body for POST /select — the user's initial prompt and busy
    level, used to resolve a region and select an initial set of places"""

    prompt: PromptText
    busy_level: BusyLevel
    # Optional: set only if the frontend already resolved a region match
    # via simple string-matching before calling the backend. If omitted,
    # the backend/LLM resolves it.
    region_hint: str | None = None


class SelectionResponse(BaseModel):
    """Response body for POST /select — the locked region plus the LLM's
    selected places, along with enough match-count info for the frontend
    to detect and handle an insufficient matches situation"""

    region: str  # the region ultimately locked in, for display + later requests
    selected: list[SelectedPlace]
    matched_count: int  # how many places matched region+prompt before target trim
    target_count_min: int
    target_count_max: int | None
    insufficient_matches: bool = False  # True if matched_count < target_count_min


# POST /refine

class RefineRequest(BaseModel):
    """Request body for POST /refine — a follow-up prompt applied against
    the current place selection, constrained to the already locked region"""

    prompt: PromptText
    locked_region: str
    current_place_ids: list[str]
    busy_level: BusyLevel


class RefineResponse(BaseModel):
    """Response body for POST /refine — either an updated place selection,
    or a flag indicating the refinement prompt requested somewhere outside
    the locked region so the frontend can offer a region switch instead"""

    selected: list[SelectedPlace]
    out_of_region_request: bool = False
    out_of_region_message: str | None = None
    # Populated only if out_of_region_request is True; lets the frontend
    # offer a "switch regions" action that restarts from selection.
    requested_region: str | None = None


# POST /itinerary

class ItineraryRequest(BaseModel):
    """Request body for POST /itinerary — the final approved set of place
    IDs and busy level, used to deterministically build the day-by-day plan"""

    place_ids: list[str]
    busy_level: BusyLevel


class ItineraryWarning(BaseModel):
    """A soft, non-blocking conflict between two or more places scheduled
    on the same day (e.g. overlapping or tight opening hours)"""

    # the two (or more) places involved
    place_ids: list[str]
    # e.g. "These may be tight to fit in one day"
    message: str


class ItineraryDay(BaseModel):
    """A single day of the generated itinerary — an ordered list of places
    plus any soft warnings surfaced for that day"""

    day_number: int
    # NOTE This is already ordered (nearest-neighbor within the day)
    places: list[Place]
    warnings: list[ItineraryWarning] = Field(default_factory=list)


class ItineraryResponse(BaseModel):
    """Response body for POST /itinerary — the full 3-day plan"""

    days: list[ItineraryDay]


# Edge-case / non-happy-path response models

class InsufficientMatchesError(BaseModel):
    """Returned (as part of SelectionResponse, not a raised exception) when
    matched_count < target_count_min. Frontend uses this to show the
    'broaden interests or busy level' prompt instead of an incomplete plan"""

    matched_count: int
    target_count_min: int
    message: str


class MinimumCountError(BaseModel):
    """Used by the frontend before enabling Approve — computed client-side
    from BUSY_LEVEL_RANGE and TRIP_LENGTH_DAYS, but mirrored here so the
    backend can also reject an itinerary request that doesn't meet it,
    rather than trusting the frontend gate alone"""

    current_count: int
    required_minimum: int
    message: str
