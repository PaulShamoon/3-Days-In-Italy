from backend.routes.selection.utils import (
    find_single_confident_match,
    resolve_requested_region,
    trim_to_target_max,
    validate_selections,
)


class TestFindSingleConfidentMatch:
    """Generic over what the candidate list represents (region, city,
    place name, ...) — resolve_requested_region is what applies this to
    each of those specifically."""

    CANDIDATES = ["Tuscany", "Lazio", "Veneto"]

    def test_single_case_insensitive_match(self):
        assert find_single_confident_match("I want to visit tuscany", self.CANDIDATES) == "Tuscany"

    def test_no_match_returns_none(self):
        assert find_single_confident_match("a relaxing coastal trip", self.CANDIDATES) is None

    def test_multiple_matches_returns_none(self):
        text = "torn between Tuscany and Lazio"
        assert find_single_confident_match(text, self.CANDIDATES) is None

    def test_unrelated_mention_does_not_match(self):
        assert find_single_confident_match("I want to see Rome", self.CANDIDATES) is None

    def test_prefers_longer_candidate_over_substring_candidate(self):
        candidates = ["Trentino", "Trentino-Alto Adige", "Lazio"]
        text = "a trip through Trentino-Alto Adige"
        assert find_single_confident_match(text, candidates) == "Trentino-Alto Adige"

    def test_still_ambiguous_when_neither_is_a_substring(self):
        candidates = ["Trentino", "Trentino-Alto Adige", "Lazio"]
        text = "torn between Trentino-Alto Adige and Lazio"
        assert find_single_confident_match(text, candidates) is None


class TestResolveRequestedRegion:
    KNOWN_REGIONS = ["Tuscany", "Lazio"]
    KNOWN_CITIES = ["Florence", "Rome"]
    CITY_TO_REGION = {"Florence": "Tuscany", "Rome": "Lazio"}
    KNOWN_PLACE_NAMES = ["Colosseum", "Uffizi Gallery"]
    PLACE_NAME_TO_REGION = {"Colosseum": "Lazio", "Uffizi Gallery": "Tuscany"}

    def _resolve(self, text):
        return resolve_requested_region(
            text,
            self.KNOWN_REGIONS,
            self.KNOWN_CITIES,
            self.CITY_TO_REGION,
            self.KNOWN_PLACE_NAMES,
            self.PLACE_NAME_TO_REGION,
        )

    def test_region_name_match_wins(self):
        assert self._resolve("let's switch to Lazio") == "Lazio"

    def test_falls_back_to_city_match(self):
        assert self._resolve("add something in Rome") == "Lazio"

    def test_falls_back_to_place_name_match(self):
        # Regression: "add the Colosseum" alone (no "Rome") must still
        # resolve, since a city-only check misses a bare landmark mention.
        assert self._resolve("add the Colosseum") == "Lazio"

    def test_returns_none_when_nothing_matches(self):
        assert self._resolve("add a nice dinner spot") is None


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
