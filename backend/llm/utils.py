from anthropic.types import Message

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


def extract_tool_input(response: Message, tool_name: str) -> dict:
    """
    Pull the input dict off the tool_use block matching tool_name from
    an Anthropic API response. Every LLM call in this module forces
    tool_choice to a specific tool, so a missing/mismatched block means
    something is actually wrong (e.g. hit max_tokens mid-call) — that's
    raised, not silently worked around.
    """
    for block in response.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input

    raise ValueError(
        f"Expected a {tool_name!r} tool_use block in the response, got: {response.content}"
    )
