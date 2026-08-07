import logging

from backend.models import Place

logger = logging.getLogger(__name__)


def match_known_region(text: str, known_regions: list[str]) -> str | None:
    """
    Case-insensitive substring match of `text` against each of
    `known_regions`. Returns the single matching region name if exactly
    one is found. Returns None on zero or multiple matches — both cases
    fall through to the LLM's pick_region call rather than guessing,
    since neither is a confident code-only resolution.

    Args:
        text (str): The free-text to search for a region name in.
        known_regions (list[str]): The region names to match against.

    Returns:
        str | None: The single matching region name, or None if zero or multiple regions matched.
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
