from fastapi import (
    APIRouter,
    Request
)

from backend.llm.llm import (
    llm_pick_region,
    llm_select_places,
    llm_refine_places
)
from backend.models import (
    Place,
    SelectionRequest,
    SelectionResponse,
    SelectedPlace,
    RefineRequest,
    RefineResponse,
    BUSY_LEVEL_RANGE,
    TRIP_LENGTH_DAYS,
)
from backend.routes.selection.utils import (
    match_known_region,
    trim_to_target_max,
    validate_selections
)

# Uses APIRouter so this module has no dependency on main.py
router = APIRouter()


@router.post("/select", response_model=SelectionResponse)
async def select_places(body: SelectionRequest, request: Request) -> SelectionResponse:
    """
    Resolve a region (from region_hint, or via string-match/LLM if not
    provided), filter the dataset to that region, and select an initial
    set of places matching the user's prompt and busy level.

    Returns insufficient_matches=True (not an error) if the matched
    places fall short of the busy level's minimum target count.
    """
    places: list[Place] = request.app.state.places
    known_regions = sorted({p.region for p in places})

    # body.region_hint is only trusted if it's actually one of the dataset's known regions, otherwise treated as no hint at all
    resolved_region: str | None = None
    if body.region_hint is not None and body.region_hint in known_regions:
        resolved_region = body.region_hint

    # String-match against literal region names and defer to the LLM unless there is exactly one confident match.
    if resolved_region is None:
        resolved_region = match_known_region(body.prompt.text, known_regions)

    if resolved_region is None:
        resolved_region = llm_pick_region(body.prompt.text, known_regions)

    filtered_places = [p for p in places if p.region == resolved_region]
    id_to_place = {p.id: p for p in filtered_places}

    raw_selections = llm_select_places(
        body.prompt.text,
        filtered_places,
        body.busy_level
    )

    validated_selections: list[dict] = validate_selections(
        raw_selections,
        id_to_place,
        "select_places"
    )

    matched_count = len(validated_selections)

    # NOTE: busy_level is per day, not per trip
    per_day_min, per_day_max = BUSY_LEVEL_RANGE[body.busy_level]
    target_min = per_day_min * TRIP_LENGTH_DAYS
    target_max = per_day_max * TRIP_LENGTH_DAYS if per_day_max is not None else None
    validated_selections = trim_to_target_max(validated_selections, target_max)

    selected = [
        SelectedPlace(id=selection["id"], reason=selection["reason"])
        for selection in validated_selections
    ]

    return SelectionResponse(
        region=resolved_region,
        selected=selected,
        matched_count=matched_count,
        target_count_min=target_min,
        target_count_max=target_max,
        insufficient_matches=matched_count < target_min,
    )


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
    known_regions = sorted({p.region for p in places})

    # String-match against literal region names and defer to the LLM unless there is exactly one confident match.
    requested_region = match_known_region(body.prompt.text, known_regions)
    # If the prompt clearly references a region other than the originally selected region, return and warn user
    if requested_region is not None and requested_region != body.locked_region:
        # NOTE: We don't return any {id, reason} data here because the frontend should ignore it and keep its existing local selection when out_of_region_request is True.
        return RefineResponse(
            selected=[],
            out_of_region_request=True,
            out_of_region_message=(
                f"That's outside your selected region ({body.locked_region}). "
                f"If you would like to switch to {requested_region} instead, please start a new trip."
            ),
            requested_region=requested_region,
        )

    filtered_places = [p for p in places if p.region == body.locked_region]
    id_to_place = {p.id: p for p in filtered_places}

    raw_selections = llm_refine_places(
        body.prompt.text,
        filtered_places,
        body.current_place_ids,
        body.locked_region,
        body.busy_level,
    )

    validated_selections: list[dict] = validate_selections(
        raw_selections,
        id_to_place,
        "refine_places"
    )

    _, per_day_max = BUSY_LEVEL_RANGE[body.busy_level]
    target_max = per_day_max * TRIP_LENGTH_DAYS if per_day_max is not None else None
    validated_selections = trim_to_target_max(validated_selections, target_max)

    selected = [
        SelectedPlace(id=selection["id"], reason=selection["reason"])
        for selection in validated_selections
    ]

    return RefineResponse(selected=selected)
