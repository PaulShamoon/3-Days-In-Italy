from backend.preprocessing import (
    fix_encoding_corruption,
    fix_encoding_corruption_deep,
)


class TestFixEncodingCorruption:
    def test_repairs_corrupted_euro_sign(self):
        # "€" (U+20AC) UTF-8-encoded then wrongly decoded as cp1252 —
        # matches the real corruption in italy.json (confirmed: strict
        # Latin-1 can't even round-trip this, since byte 0x82 has no
        # printable Latin-1 character but cp1252 maps it to '‚').
        corrupted = "€".encode("utf-8").decode("cp1252")
        assert fix_encoding_corruption(corrupted) == "€"

    def test_repairs_corrupted_em_dash(self):
        corrupted = "—".encode("utf-8").decode("cp1252")
        assert fix_encoding_corruption(corrupted) == "—"

    def test_leaves_already_correct_string_unchanged(self):
        assert fix_encoding_corruption("Trattoria da Mario") == "Trattoria da Mario"

    def test_leaves_plain_ascii_unchanged(self):
        assert fix_encoding_corruption("9:00-19:00") == "9:00-19:00"

    def test_empty_string_unchanged(self):
        assert fix_encoding_corruption("") == ""

    def test_regression_strict_latin1_cannot_fix_this(self):
        # Guards against reverting to .encode("latin-1"): byte 0x82 has
        # no printable Latin-1 codepoint, so a strict Latin-1 round-trip
        # raises UnicodeEncodeError on exactly this corrupted string —
        # which is why the bug shipped silently (the try/except made
        # the failure invisible) until caught by visual inspection.
        corrupted = "€".encode("utf-8").decode("cp1252")
        try:
            corrupted.encode("latin-1")
            raise AssertionError("expected latin-1 encode to fail for this input")
        except UnicodeEncodeError:
            pass
        assert fix_encoding_corruption(corrupted) == "€"


class TestFixEncodingCorruptionDeep:
    def test_fixes_string_at_top_level(self):
        corrupted = "€".encode("utf-8").decode("cp1252")
        assert fix_encoding_corruption_deep(corrupted) == "€"

    def test_fixes_strings_nested_in_dict(self):
        corrupted = "€".encode("utf-8").decode("cp1252")
        data = {"price_range": corrupted, "rating": 4.5}
        result = fix_encoding_corruption_deep(data)
        assert result == {"price_range": "€", "rating": 4.5}

    def test_fixes_strings_nested_in_list(self):
        corrupted = "€".encode("utf-8").decode("cp1252")
        result = fix_encoding_corruption_deep([corrupted, "plain"])
        assert result == ["€", "plain"]

    def test_fixes_strings_nested_in_list_inside_dict(self):
        corrupted = "€".encode("utf-8").decode("cp1252")
        data = {"tags": ["wine", corrupted]}
        result = fix_encoding_corruption_deep(data)
        assert result == {"tags": ["wine", "€"]}

    def test_non_string_scalars_pass_through_unchanged(self):
        data = {"rating": 4.5, "booking_required": None, "count": 3, "flag": True}
        assert fix_encoding_corruption_deep(data) == data

    def test_full_place_like_structure(self):
        corrupted = "€".encode("utf-8").decode("cp1252")
        data = [
            {
                "id": "place_001",
                "price_range": corrupted,
                "rating": 4.5,
                "tags": ["wine", "quiet"],
                "booking_required": None,
            }
        ]
        result = fix_encoding_corruption_deep(data)
        assert result == [
            {
                "id": "place_001",
                "price_range": "€",
                "rating": 4.5,
                "tags": ["wine", "quiet"],
                "booking_required": None,
            }
        ]
