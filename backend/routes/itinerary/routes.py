from fastapi import (
    APIRouter,
    HTTPException,
    Request
)

from backend.models import (
    Place,
    ItineraryRequest,
    ItineraryResponse,
    ItineraryDay,
    BUSY_LEVEL_RANGE,
    TRIP_LENGTH_DAYS,
)
from backend.routes.itinerary.utils import (
    nearest_neighbor_tour,
    split_into_days,
    reorder_evening_only_last,
    evening_only_warnings
)

# Uses APIRouter so this module has no dependency on main.py
router = APIRouter()


@router.post("/itinerary", response_model=ItineraryResponse)
async def build_itinerary(body: ItineraryRequest, request: Request) -> ItineraryResponse:
    """
    Deterministically build a 3-day itinerary from the approved place
    IDs. Builds a single greedy nearest-neighbor tour
    across all approved places (anchored at the westernmost place), then
    slices it into TRIP_LENGTH_DAYS consecutive groups — this both
    clusters places into days by geographic proximity and leaves each
    day already ordered by proximity, in one pass.

    Raises 400 if place_ids don't meet the busy level's minimum count
    for a 3-day trip (mirrors the frontend's pre-Approve gate, enforced
    again here in case that gate is bypassed).

    Args:
        body (ItineraryRequest): The approved place IDs and busy level.
        request (Request): The incoming request, used to access the loaded dataset on app.state.

    Returns:
        ItineraryResponse: The full 3-day, day-by-day itinerary.
    """
    places: list[Place] = request.app.state.places
    id_to_place = {p.id: p for p in places}

    missing = [pid for pid in body.place_ids if pid not in id_to_place]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown place ids: {missing}")

    # De-duplicate while preserving first-occurrence order
    unique_place_ids = list(dict.fromkeys(body.place_ids))

    per_day_min, _ = BUSY_LEVEL_RANGE[body.busy_level]
    required_minimum = per_day_min * TRIP_LENGTH_DAYS
    if len(unique_place_ids) < required_minimum:
        raise HTTPException(
            status_code=400,
            detail=(
                f"At least {required_minimum} places are required for a "
                f"{TRIP_LENGTH_DAYS}-day {body.busy_level.value} trip — "
                f"got {len(unique_place_ids)}."
            ),
        )

    selected_places = [id_to_place[pid] for pid in unique_place_ids]
    tour = nearest_neighbor_tour(selected_places)
    day_groups = split_into_days(tour)

    days = []
    # Reorder each day so that evening-only places are always last, and attach any soft warnings about evening-only overlaps.
    for day_index, day_group in enumerate(day_groups):
        ordered = reorder_evening_only_last(day_group)
        days.append(
            ItineraryDay(
                day_number=day_index + 1,
                places=ordered,
                warnings=evening_only_warnings(ordered),
            )
        )

    return ItineraryResponse(days=days)
