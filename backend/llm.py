import os

import anthropic

from backend.models import (
    BusyLevel,
    BUSY_LEVEL_RANGE,
    Place
)

# TODO: replace with a real key via .env once Anthropic access is set up.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "placeholder-key-not-set")

MODEL = "claude-sonnet-5"

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# Tool schemas

REGION_PICK_TOOL = {
    "name": "pick_region",
    "description": "Select exactly one region for the trip from the provided list.",
    "input_schema": {
        "type": "object",
        "properties": {
            "region": {
                "type": "string",
                "description": "Must exactly match one of the region names provided in the prompt.",
            }
        },
        "required": ["region"],
    },
}

SELECT_PLACES_TOOL = {
    "name": "select_places",
    "description": "Select places from the provided list that match the user's trip request.",
    "input_schema": {
        "type": "object",
        "properties": {
            "selections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Must exactly match an id from the provided place list.",
                        },
                        "reason": {
                            "type": "string",
                            "description": "One short sentence explaining why this place fits the user's request.",
                        },
                    },
                    "required": ["id", "reason"],
                },
            }
        },
        "required": ["selections"],
    },
}


# Prompt builders

def _place_summary(place: Place) -> dict:
    """Trimmed place fields sent to the LLM for selection — only what's
    useful for matching against a user's request. lat/long, hours,
    seasonal_notes, and booking_required are intentionally omitted here;
    they matter for map/detail rendering, not for selection."""
    return {
        "id": place.id,
        "name": place.name,
        "type": place.type,
        "tags": place.tags,
        "description": place.description,
        "rating": place.rating,
        "price_range": place.price_range,
    }


def llm_pick_region(user_prompt: str, available_regions: list[str]) -> str:
    """
    First LLM call (region-pick mode): given the user's free-text prompt and
    the distinct regions present in the dataset, pick exactly one region.
    Only called when the frontend didn't already resolve a region_hint
    via string-matching.
    """
    system_prompt = (
        "You are choosing a single Italian region for a 3-day trip, based on "
        "a traveler's description of what they want. You must pick exactly "
        "one region from the provided list — never invent a region that "
        "isn't in the list."
    )

    user_message = (
        f"Traveler's request: {user_prompt}\n\n"
        f"Available regions: {', '.join(available_regions)}\n\n"
        "Pick the single best-matching region."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=system_prompt,
        tools=[REGION_PICK_TOOL],
        tool_choice={"type": "tool", "name": "pick_region"},
        messages=[{"role": "user", "content": user_message}],
    )

    # TODO: extract tool_use block from response.content, return input["region"]
    # TODO: validate the returned region is actually in available_regions;
    #       if not, raise (do not silently fall back to a guess)
    raise NotImplementedError


def llm_select_places(
    user_prompt: str,
    places: list[Place],
    busy_level: BusyLevel,
) -> list[dict]:
    """
    Second LLM call (selection mode): given a region-filtered place list, the
    user's prompt, and the busy level's target count range, select places
    matching the request. Returns raw {id, reason} dicts — validation
    against the dataset and count-checking against BUSY_LEVEL_RANGE
    happens in the route handler, not here.
    """
    target_min, target_max = BUSY_LEVEL_RANGE[busy_level]
    target_desc = (
        f"{target_min}-{target_max}" if target_max else f"{target_min}+"
    )

    system_prompt = (
        "You are selecting places for a traveler's 3-day trip to Italy, from "
        "a fixed list of places. Rules:\n"
        "- Only select places from the provided list. Never invent a place "
        "or use an id that isn't in the list.\n"
        f"- Select approximately {target_desc} places total, matching the "
        "traveler's stated interests and vibe.\n"
        "- For each selection, write a one-sentence reason explaining why "
        "it fits what the traveler asked for, in plain, natural language."
    )

    user_message = (
        f"Traveler's request: {user_prompt}\n\n"
        f"Available places: {[_place_summary(p) for p in places]}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=system_prompt,
        tools=[SELECT_PLACES_TOOL],
        tool_choice={"type": "tool", "name": "select_places"},
        messages=[{"role": "user", "content": user_message}],
    )

    # TODO: extract tool_use block from response.content, return input["selections"]
    raise NotImplementedError


def llm_refine_places(
    user_prompt: str,
    places: list[Place],
    current_place_ids: list[str],
    locked_region: str,
    busy_level: BusyLevel,
) -> list[dict]:
    """
    Third LLM call (refinement mode): adjust the current selection based on a
    follow-up prompt, with the region held as a hard, non-negotiable
    constraint. `places` is expected to already be filtered to
    locked_region by the caller — this function does not filter it.

    Assumes the caller has already checked the prompt doesn't reference
    a different region (see routes.py's out-of-region check) before
    calling this — this function does not re-check that.
    """
    target_min, target_max = BUSY_LEVEL_RANGE[busy_level]
    target_desc = (
        f"{target_min}-{target_max}" if target_max else f"{target_min}+"
    )

    system_prompt = (
        "You are adjusting an existing trip selection based on the "
        "traveler's follow-up request. Rules:\n"
        "- Only select places from the provided list. Never invent a place "
        "or use an id that isn't in the list.\n"
        f"- The trip is locked to the {locked_region} region. Every place "
        "you select must be in this region — this is a hard requirement, "
        "not a preference.\n"
        f"- Aim for approximately {target_desc} places total after applying "
        "the traveler's requested changes.\n"
        "- This is an adjustment to an existing selection, not a fresh "
        "start — keep places that still fit unless the traveler's request "
        "implies removing them.\n"
        "- For each selection, write a one-sentence reason explaining why "
        "it fits, in plain, natural language."
    )

    user_message = (
        f"Currently selected place ids: {current_place_ids}\n\n"
        f"Traveler's follow-up request: {user_prompt}\n\n"
        f"Available places in {locked_region}: {[_place_summary(p) for p in places]}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=system_prompt,
        tools=[SELECT_PLACES_TOOL],
        tool_choice={"type": "tool", "name": "select_places"},
        messages=[{"role": "user", "content": user_message}],
    )

    # TODO: extract tool_use block from response.content, return input["selections"]
    raise NotImplementedError
