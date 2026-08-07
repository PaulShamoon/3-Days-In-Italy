import re

from haversine import haversine

from backend.models import (
    ItineraryWarning,
    Place,
    TRIP_LENGTH_DAYS
)

# Hour (24h) at/after which a place's first opening time counts as
# "evening-only" rather than a normal daytime stop.
EVENING_CUTOFF_HOUR = 17  # 5 PM

_FIRST_TIME_RE = re.compile(r"(\d{1,2})(?::\d{2})?\s*(am|pm)?", re.IGNORECASE)


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


def extract_first_open_hour(hours: str | None) -> int | None:
    """
    Extract just the 24h hour of a place's first opening time from its
    free-text `hours` field (e.g. "Mon-Sat 19:30-22:30" -> 19, "8am-7pm"
    -> 8). Ignores everything else — day-of-week prefixes, closing
    times, additional lunch/dinner slots — since all that's needed is
    "does this place open early enough to be a normal daytime stop."
    Returns None for null or non-numeric hours text (e.g. "Evenings"),
    treated as unconstrained rather than guessed at.
    """
    if hours is None:
        return None

    match = _FIRST_TIME_RE.search(hours)
    if match is None:
        return None

    hour = int(match.group(1))
    meridiem = (match.group(2) or "").lower()

    if meridiem == "pm" and hour != 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0

    return hour


def is_evening_only(place: Place) -> bool:
    """A place is evening-only if its first opening time is at/after
    EVENING_CUTOFF_HOUR. Unconstrained (unparseable/null hours) places
    are never evening-only."""
    first_open_hour = extract_first_open_hour(place.hours)
    return first_open_hour is not None and first_open_hour >= EVENING_CUTOFF_HOUR


def reorder_evening_only_last(day_places: list[Place]) -> list[Place]:
    """
    Stable-sort a day's places so evening-only places move after
    daytime-compatible ones, preserving the existing (nearest-neighbor)
    order within each group. Fixes cases like a dinner-only restaurant
    ending up as the first stop of the day.
    """
    return sorted(day_places, key=is_evening_only)


def evening_only_warnings(day_places: list[Place]) -> list[ItineraryWarning]:
    """
    Flag adjacent pairs in a day's final order that are both
    evening-only — realistically only one dinner-hour venue fits per
    evening. Normal daytime-into-evening transitions aren't flagged.
    """
    warnings = []
    for first, second in zip(day_places, day_places[1:]):
        if is_evening_only(first) and is_evening_only(second):
            warnings.append(
                ItineraryWarning(
                    place_ids=[first.id, second.id],
                    message=(
                        f"{first.name} and {second.name} are both evening-only "
                        "— may be tight to fit in one evening."
                    ),
                )
            )
    return warnings


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
