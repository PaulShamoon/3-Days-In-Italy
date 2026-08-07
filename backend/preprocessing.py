"""
Fix for UTF-8-decoded-as-cp1252 corruption present in the raw
italy.json data, specifically in the price_range and description fields.

(e.g. "â‚¬" instead of "€", "â€”" instead of "—"). Applied to every
string field rather than a hardcoded list, since corruption showed up
in more than one field and a full walk is no more complex to write or
maintain than tracking which specific fields are affected.

Cause (confirmed): the file's UTF-8 bytes were, at some point, read/written as if
they were Windows-1252 (cp1252), so each multi-byte UTF-8 character got
split into multiple wrong single-byte characters under that encoding.
Reversing it means encoding the corrupted text back to those original
bytes as cp1252, then decoding those bytes as UTF-8.

Run once at dataset load time (see main.py's lifespan), not per-request
"""


def fix_encoding_corruption(value: str) -> str:
    """
    Repair a single string if it shows UTF-8/cp1252 double-encoding
    corruption. Strings that aren't actually corrupted round-trip
    through this safely and are returned unchanged; strings that fail
    the round-trip (not valid cp1252, or not valid UTF-8 once
    re-decoded) are assumed to already be fine and returned as-is
    rather than raising.

    Args:
        value (str): The string to check and repair if corrupted.

    Returns:
        str: The repaired string, or the original if it wasn't corrupted.
    """
    try:
        return value.encode("cp1252").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value


def fix_encoding_corruption_deep(data):
    """
    Recursively apply fix_encoding_corruption to every string found in a
    JSON-like structure (dicts, lists, and their nested contents) —
    covers top-level string fields (description, price_range, ...) as
    well as string fields nested inside lists (tags).

    Args:
        data (Any): A JSON-like value (dict, list, string, or other scalar) to walk recursively.

    Returns:
        Any: The same structure with every string value repaired.
    """
    if isinstance(data, str):
        return fix_encoding_corruption(data)

    if isinstance(data, list):
        return [fix_encoding_corruption_deep(item) for item in data]

    if isinstance(data, dict):
        return {key: fix_encoding_corruption_deep(value) for key, value in data.items()}

    return data
