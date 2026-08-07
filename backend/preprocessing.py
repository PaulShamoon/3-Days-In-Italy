"""
Fix for UTF-8-decoded-as-Latin-1 corruption present in the raw italy.json
data, specifically in the price_range and description fields.

(e.g. "â‚¬" instead of "€", "â€”" instead of "—"). Applied to every
string field rather than a hardcoded list, since corruption showed up
in more than one field and a full walk is no more complex to write or
maintain than tracking which specific fields are affected.

Cause (assumption): the file's UTF-8 bytes were, at some point, read/written as if
they were Latin-1, so each multi-byte UTF-8 character got split into
multiple wrong single-byte characters. Reversing that — encode back to
the original bytes as Latin-1, then decode those bytes as UTF-8 — repairs it.

Run once at dataset load time (see main.py's lifespan), not per-request
"""


def fix_encoding_corruption(value: str) -> str:
    """
    Repair a single string if it shows UTF-8/Latin-1 double-encoding
    corruption. Strings that aren't actually corrupted round-trip
    through this safely and are returned unchanged; strings that fail
    the round-trip (not valid Latin-1, or not valid UTF-8 once
    re-decoded) are assumed to already be fine and returned as-is
    rather than raising.
    """
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value


def fix_encoding_corruption_deep(data):
    """
    Recursively apply fix_encoding_corruption to every string found in a
    JSON-like structure (dicts, lists, and their nested contents) —
    covers top-level string fields (description, price_range, ...) as
    well as string fields nested inside lists (tags).
    """
    if isinstance(data, str):
        return fix_encoding_corruption(data)

    if isinstance(data, list):
        return [fix_encoding_corruption_deep(item) for item in data]

    if isinstance(data, dict):
        return {key: fix_encoding_corruption_deep(value) for key, value in data.items()}

    return data
