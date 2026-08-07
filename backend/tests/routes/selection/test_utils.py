from backend.routes.selection.utils import (
    match_known_region,
    trim_to_target_max,
    validate_selections,
)


class TestMatchKnownRegion:
    KNOWN_REGIONS = ["Tuscany", "Lazio", "Veneto"]

    def test_single_case_insensitive_match(self):
        assert match_known_region("I want to visit tuscany", self.KNOWN_REGIONS) == "Tuscany"

    def test_no_match_returns_none(self):
        assert match_known_region("a relaxing coastal trip", self.KNOWN_REGIONS) is None

    def test_multiple_matches_returns_none(self):
        text = "torn between Tuscany and Lazio"
        assert match_known_region(text, self.KNOWN_REGIONS) is None

    def test_city_only_mention_does_not_match(self):
        # "Rome" isn't a region name, so no code-only match — falls
        # through to the LLM by design.
        assert match_known_region("I want to see Rome", self.KNOWN_REGIONS) is None

    def test_prefers_longer_region_over_substring_region(self):
        regions = ["Trentino", "Trentino-Alto Adige", "Lazio"]
        text = "a trip through Trentino-Alto Adige"
        assert match_known_region(text, regions) == "Trentino-Alto Adige"

    def test_still_ambiguous_when_neither_is_a_substring(self):
        regions = ["Trentino", "Trentino-Alto Adige", "Lazio"]
        text = "torn between Trentino-Alto Adige and Lazio"
        assert match_known_region(text, regions) is None


class TestTrimToTargetMax:
    def test_under_max_unchanged(self):
        selections = [{"id": "1"}, {"id": "2"}]
        assert trim_to_target_max(selections, 5) == selections

    def test_over_max_truncates_preserving_order(self):
        selections = [{"id": str(i)} for i in range(5)]
        result = trim_to_target_max(selections, 3)
        assert result == selections[:3]

    def test_exactly_at_max_unchanged(self):
        selections = [{"id": "1"}, {"id": "2"}]
        assert trim_to_target_max(selections, 2) == selections

    def test_none_max_never_trims(self):
        selections = [{"id": str(i)} for i in range(20)]
        assert trim_to_target_max(selections, None) == selections


class TestValidateSelections:
    def test_keeps_known_ids(self, make_place):
        places = [make_place(id="place_001"), make_place(id="place_002")]
        id_to_place = {p.id: p for p in places}
        raw = [{"id": "place_001", "reason": "x"}, {"id": "place_002", "reason": "y"}]

        assert validate_selections(raw, id_to_place, "select_places") == raw

    def test_drops_unknown_ids(self, make_place):
        places = [make_place(id="place_001")]
        id_to_place = {p.id: p for p in places}
        raw = [
            {"id": "place_001", "reason": "x"},
            {"id": "place_999", "reason": "hallucinated"},
        ]

        result = validate_selections(raw, id_to_place, "select_places")
        assert result == [{"id": "place_001", "reason": "x"}]

    def test_all_unknown_returns_empty(self, make_place):
        places = [make_place(id="place_001")]
        id_to_place = {p.id: p for p in places}
        raw = [{"id": "place_999", "reason": "hallucinated"}]

        assert validate_selections(raw, id_to_place, "select_places") == []

    def test_drops_duplicate_ids_keeping_first_occurrence(self, make_place):
        places = [make_place(id="place_001")]
        id_to_place = {p.id: p for p in places}
        raw = [
            {"id": "place_001", "reason": "first reason"},
            {"id": "place_001", "reason": "second reason"},
        ]

        result = validate_selections(raw, id_to_place, "select_places")
        assert result == [{"id": "place_001", "reason": "first reason"}]
