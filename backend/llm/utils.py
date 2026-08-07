from backend.models import (
    BusyLevel,
    BUSY_LEVEL_RANGE,
    TRIP_LENGTH_DAYS
)

def target_count_description(busy_level: BusyLevel) -> str:
    """
    Human-readable total-place-count target for an LLM prompt (e.g.
    "12-15" or "18+"). BUSY_LEVEL_RANGE stores per-day caps, but these
    calls select the whole trip's places in one shot — day-clustering
    happens later in /itinerary — so this multiplies by TRIP_LENGTH_DAYS
    to get the total-for-the-trip target.
    """
    per_day_min, per_day_max = BUSY_LEVEL_RANGE[busy_level]
    total_min = per_day_min * TRIP_LENGTH_DAYS
    total_max = per_day_max * TRIP_LENGTH_DAYS if per_day_max is not None else None
    return f"{total_min}-{total_max}" if total_max is not None else f"{total_min}+"
