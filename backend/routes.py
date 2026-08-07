from fastapi import (
    APIRouter,
    HTTPException,
    Request
)

from models import (
    Place,
    SelectionRequest,
    SelectionResponse,
    RefineRequest,
    RefineResponse,
    ItineraryRequest,
    ItineraryResponse,
)

# Uses APIRouter so this module has no dependency on main.py
router = APIRouter()


@router.post("/select", response_model=SelectionResponse)
async def select_places(body: SelectionRequest, request: Request) -> SelectionResponse:
    """
    Resolve a region (from region_hint, or via LLM if not provided),
    filter the dataset to that region, and select an initial set of
    places matching the user's prompt and busy level.

    Returns insufficient_matches=True (not an error) if the matched
    places fall short of the busy level's minimum target count.
    """
    places: list[Place] = request.app.state.places

    # TODO: resolve region (string-match body.region_hint, or LLM pick if None)
    # TODO: filter `places` to resolved region
    # TODO: call LLM for place selection, get back {id, reason} pairs
    # TODO: validate every returned id exists in the filtered dataset;
    #       drop any that don't (do not raise — just exclude and log)
    # TODO: compare matched_count against BUSY_LEVEL_RANGE for insufficient_matches

    raise NotImplementedError


@router.post("/refine", response_model=RefineResponse)
async def refine_places(body: RefineRequest, request: Request) -> RefineResponse:
    """
    Apply a follow-up prompt against the current place selection, with
    the region locked to body.locked_region.

    If the prompt references a place/area outside the locked region,
    returns out_of_region_request=True (not an error) instead of
    silently ignoring or complying with the request.
    """
    places: list[Place] = request.app.state.places

    # TODO: code-level check — does body.prompt reference a region other
    #       than body.locked_region? (string-match against known regions,
    #       same approach as initial region resolution)
    # TODO: if out-of-region, return early with out_of_region_request=True
    #       and requested_region set, no LLM call needed
    # TODO: otherwise, call LLM with explicit hard instruction to respect
    #       locked_region, current_place_ids as context, get back updated
    #       {id, reason} pairs
    # TODO: validate every returned id exists in the filtered dataset

    raise NotImplementedError


@router.post("/itinerary", response_model=ItineraryResponse)
async def build_itinerary(body: ItineraryRequest, request: Request) -> ItineraryResponse:
    """
    Deterministically build a 3-day itinerary from the approved place
    IDs — no LLM call. Day-clusters by proximity within the busy level's
    per-day cap, orders each day by nearest-neighbor, and attaches soft
    hours-overlap warnings.

    Raises 400 if place_ids don't meet the busy level's minimum count
    for a 3-day trip (mirrors the frontend's pre-Approve gate, enforced
    again here in case that gate is bypassed).
    """
    places: list[Place] = request.app.state.places
    id_to_place = {p.id: p for p in places}

    missing = [pid for pid in body.place_ids if pid not in id_to_place]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown place ids: {missing}")

    # TODO: check body.place_ids count against BUSY_LEVEL_RANGE minimum
    #       for TRIP_LENGTH_DAYS; raise HTTPException(400) if short

    # TODO: day-cluster by proximity into TRIP_LENGTH_DAYS groups,
    #       sized to the busy level's per-day cap
    # TODO: nearest-neighbor order within each day
    # TODO: compute ItineraryWarning entries for hours-overlap conflicts

    raise NotImplementedError
