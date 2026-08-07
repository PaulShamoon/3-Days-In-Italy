import logging

from haversine import haversine

from backend.models import (
    Place,
    TRIP_LENGTH_DAYS
)

logger = logging.getLogger(__name__)


def match_known_region(text: str, known_regions: list[str]) -> str | None:
    """
    Case-insensitive substring match of `text` against each of
    `known_regions`. Returns the single matching region name if exactly
    one is found. Returns None on zero or multiple matches — both cases
    fall through to the LLM's pick_region call rather than guessing,
    since neither is a confident code-only resolution.
    """
    lowered = text.lower()
    matches = [region for region in known_regions if region.lower() in lowered]
    return matches[0] if len(matches) == 1 else None


def trim_to_target_max(selections: list[dict], target_max: int | None) -> list[dict]:
    """
    Safety trim: if `selections` exceeds target_max, truncate to the
    first target_max entries, preserving order. LLMs aren't guaranteed
    to respect a requested count, and LLM output carries no per-item
    confidence/ranking signal, so "keep the order returned" is the only
    principled trim rule available. No-op if target_max is None (busy
    level has no upper bound) or the count isn't exceeded.
    """
    # NOTE: we will only have a target_max for chill and busy busy_level's
    if target_max is not None and len(selections) > target_max:
        return selections[:target_max]
    return selections


def validate_selections(
    raw_selections: list[dict],
    id_to_place: dict[str, Place],
    source: str,
) -> list[dict]:
    """
    Ground every LLM-returned selection against the actual (region-
    filtered) dataset — drop (don't raise on) any id that doesn't exist,
    since a hallucinated or out-of-region id should be silently excluded
    rather than surfaced as an error to the user. `source` identifies
    the caller for the warning log (e.g. "select_places", "refine_places").
    """
    validated = []
    for selection in raw_selections:
        if selection["id"] in id_to_place:
            validated.append(selection)
        else:
            logger.warning(
                "%s LLM call returned unknown place id %r — dropping",
                source,
                selection.get("id"),
            )
    return validated


def nearest_neighbor_tour(places: list[Place]) -> list[Place]:
    """
    Greedy nearest-neighbor tour across all places: start from the
    westernmost place (a deterministic anchor regardless of input
    order — doesn't depend on LLM selection/refinement order), then
    repeatedly move to the nearest unvisited place.

    This single tour serves double duty for itinerary building: slicing
    it into TRIP_LENGTH_DAYS consecutive chunks (see split_into_days)
    both clusters places by geographic proximity into days AND leaves
    each day's places already in nearest-neighbor order, without a
    separate per-day ordering pass.
    """
    if not places:
        return []

    remaining = list(places)
    current = min(remaining, key=lambda p: p.longitude)
    remaining.remove(current)
    tour = [current]

    while remaining:
        current = min(
            remaining,
            key=lambda p: haversine(
                (current.latitude, current.longitude),
                (p.latitude, p.longitude))
        )
        remaining.remove(current)
        tour.append(current)

    return tour


def split_into_days(tour: list[Place]) -> list[list[Place]]:
    """
    Slice an ordered tour into TRIP_LENGTH_DAYS consecutive groups. When the
    count doesn't divide evenly, earlier days get the extra place(s) so
    no day ends up sparse relative to the others.
    """
    base, remainder = divmod(len(tour), TRIP_LENGTH_DAYS)

    days = []
    start = 0
    for day_index in range(TRIP_LENGTH_DAYS):
        size = base + (1 if day_index < remainder else 0)
        days.append(tour[start:start + size])
        start += size

    return days
