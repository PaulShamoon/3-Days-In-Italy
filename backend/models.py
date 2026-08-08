"""
Pydantic models — backend contracts for the trip planner

Organized in three groups:
1. Core data model (mirrors italy.json)
2. Shared sub-models (reused across multiple endpoints)
3. Per-endpoint request/response pairs
"""

from enum import Enum
from pydantic import (
    BaseModel,
    Field,
    field_validator
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
    booking_required: bool | None = None


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


# Minimum (whitespace-stripped) prompt length
PROMPT_MIN_LENGTH = 15


class PromptText(BaseModel):
    """Reusable prompt field with the shared 500-character limit, enforced
    server side regardless of frontend validation. Also requires
    PROMPT_MIN_LENGTH non-whitespace-padded characters — a bare min_length=1
    lets something meaningless like "the" through, giving the LLM nothing to
    actually work from."""

    text: str = Field(..., max_length=500, min_length=1)

    @field_validator("text")
    @classmethod
    def _require_meaningful_length(cls, value: str) -> str:
        """Strips whitespace, then enforces PROMPT_MIN_LENGTH on what's
        left — declarative Field(min_length=...) alone would count
        whitespace padding, letting something like "   the   " through.

        Args:
            value (str): The raw, unvalidated "text" field value.

        Returns:
            The whitespace-stripped value, stored in place of the raw input.
        """
        stripped = value.strip()
        if len(stripped) < PROMPT_MIN_LENGTH:
            raise ValueError(
                f"Tell us a bit more — at least {PROMPT_MIN_LENGTH} characters."
            )
        return stripped


# GET /places

class PlacesResponse(BaseModel):
    """Response body for GET /places — the full place details for a
    region. /select and /refine only return {id, reason} pairs, so the
    frontend fetches this once per locked region and joins locally to
    render map pins and place cards."""

    places: list[Place]


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
    the locked region, in which case the frontend shows out_of_region_message
    and tells the user to start a new trip if they want that region — there's
    no automatic "switch region" action."""

    selected: list[SelectedPlace]
    out_of_region_request: bool = False
    out_of_region_message: str | None = None
    # Populated only if out_of_region_request is True. Not currently used
    # to drive any frontend action (no "switch region" flow) — included so
    # the frontend/logs can name which region was actually being asked for.
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
