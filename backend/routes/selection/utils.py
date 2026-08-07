import logging

from backend.models import Place

logger = logging.getLogger(__name__)


def _is_substring_of_another_match(region: str, matches: list[str]) -> bool:
    """
    Whether `region` is fully contained within a different, longer
    match — e.g. a hypothetical "Trentino" inside "Trentino-Alto Adige".

    Args:
        region (str): The region name to check.
        matches (list[str]): All region names matched so far.

    Returns:
        bool: True if some other match in `matches` contains `region` as a substring.
    """
    for other in matches:
        if other != region and region.lower() in other.lower():
            return True

    return False


def find_single_confident_match(text: str, candidates: list[str]) -> str | None:
    """
    Case-insensitive substring match of `text` against each of
    `candidates`. Returns the single matching candidate if exactly one
    is found. Returns None on zero or multiple matches, since neither
    is a confident code-only resolution. A candidate that's itself a
    substring of another matched candidate is dropped in favor of the
    longer, more specific match rather than counted as a separate
    ambiguous match — otherwise a text naming one specific candidate
    could never resolve.

    Generic over what `candidates` represents — region names, city
    names, place names, etc. — the matching logic itself doesn't care.

    Args:
        text (str): The free-text to search for a candidate name in.
        candidates (list[str]): The names to match against.

    Returns:
        str | None: The single matching candidate, or None if zero or multiple matched.
    """
    lowered_text = text.lower()
    matches = [candidate for candidate in candidates if candidate.lower() in lowered_text]

    specific_matches = [
        candidate for candidate in matches
        if not _is_substring_of_another_match(candidate, matches)
    ]

    return specific_matches[0] if len(specific_matches) == 1 else None


def resolve_requested_region(
    text: str,
    known_regions: list[str],
    known_cities: list[str],
    city_to_region: dict[str, str],
    known_place_names: list[str],
    place_name_to_region: dict[str, str],
) -> str | None:
    """
    Best-effort code-only resolution of which region (if any) a piece
    of free text is asking about, tried in order of specificity: a
    literal region name, then a city name, then a specific place name
    from the full dataset. Used by /refine's out-of-region check so the
    locked-region constraint is enforced structurally, catching a
    city/landmark mention ("Rome", "the Colosseum") that a region-name-
    only check would miss.

    Returns None if nothing confidently matches — that means this
    code-only pass found no reason to flag the request, not that it's
    definitely in-region. The LLM call that follows still receives a
    hard region-lock instruction as a backstop, and a landmark this
    dataset doesn't itself contain can still slip through; this is a
    best-effort structural guard, not a substitute for that instruction.

    Args:
        text (str): The free-text to resolve a region from.
        known_regions (list[str]): Known region names.
        known_cities (list[str]): Known city names.
        city_to_region (dict[str, str]): City name -> region, for every place in the dataset.
        known_place_names (list[str]): Every place name in the full dataset (all regions).
        place_name_to_region (dict[str, str]): Place name -> region, for every place in the dataset.

    Returns:
        str | None: The resolved region, or None if nothing confidently matched.
    """
    region = find_single_confident_match(text, known_regions)
    if region is not None:
        return region

    city = find_single_confident_match(text, known_cities)
    if city is not None:
        return city_to_region[city]

    place_name = find_single_confident_match(text, known_place_names)
    if place_name is not None:
        return place_name_to_region[place_name]

    return None


def trim_to_target_max(selections: list[dict], target_max: int | None) -> list[dict]:
    """
    Safety trim: if `selections` exceeds target_max, truncate to the
    first target_max entries, preserving order. LLMs aren't guaranteed
    to respect a requested count, and LLM output carries no per-item
    confidence/ranking signal, so "keep the order returned" is the only
    principled trim rule available. No-op if target_max is None (busy
    level has no upper bound) or the count isn't exceeded.

    Args:
        selections (list[dict]): The LLM-returned selections to trim.
        target_max (int | None): The maximum number of selections to keep, or None for no limit.

    Returns:
        list[dict]: The selections, truncated to target_max if it was exceeded.
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
    rather than surfaced as an error to the user. Also drops repeated
    ids (keeping the first occurrence), since nothing downstream expects
    the same place to appear twice and an inflated count would corrupt
    matched_count/insufficient_matches. `source` identifies the caller
    for the warning log (e.g. "select_places", "refine_places").

    Args:
        raw_selections (list[dict]): The LLM-returned {id, reason} selections to validate.
        id_to_place (dict[str, Place]): The filtered dataset's places, keyed by id.
        source (str): A label identifying the caller, used in the dropped-id warning log.

    Returns:
        list[dict]: The de-duplicated selections whose id exists in id_to_place.
    """
    validated = []
    seen_ids = set()
    for selection in raw_selections:
        selection_id = selection["id"]
        if selection_id not in id_to_place:
            logger.warning(
                "%s LLM call returned unknown place id %r — dropping",
                source,
                selection_id,
            )
        elif selection_id in seen_ids:
            logger.warning(
                "%s LLM call returned duplicate place id %r — dropping",
                source,
                selection_id,
            )
        else:
            seen_ids.add(selection_id)
            validated.append(selection)
    return validated
