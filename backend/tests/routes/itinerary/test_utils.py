from backend.routes.itinerary.utils import (
    nearest_neighbor_tour,
    extract_first_open_hour,
    is_evening_only,
    reorder_evening_only_last,
    evening_only_warnings,
    split_into_days,
    EVENING_CUTOFF_HOUR,
)


class TestNearestNeighborTour:
    def test_empty_list_returns_empty(self):
        assert nearest_neighbor_tour([]) == []

    def test_single_place_returns_itself(self, make_place):
        place = make_place(id="place_001")
        assert nearest_neighbor_tour([place]) == [place]

    def test_starts_from_westernmost_place(self, make_place):
        west = make_place(id="west", longitude=9.0, latitude=45.0)
        east = make_place(id="east", longitude=13.0, latitude=45.0)
        middle = make_place(id="middle", longitude=11.0, latitude=45.0)

        tour = nearest_neighbor_tour([east, middle, west])
        assert tour[0].id == "west"

    def test_visits_every_place_exactly_once(self, make_place):
        places = [
            make_place(id=f"p{i}", longitude=float(i), latitude=45.0)
            for i in range(5)
        ]
        tour = nearest_neighbor_tour(places)
        assert {p.id for p in tour} == {p.id for p in places}
        assert len(tour) == len(places)

    def test_greedily_picks_nearest_unvisited(self, make_place):
        # west=0, near_west=1, far_east=10 -- from west, near_west (dist 1)
        # is nearer than far_east (dist 10), so it should be visited next.
        west = make_place(id="west", longitude=0.0, latitude=45.0)
        near_west = make_place(id="near_west", longitude=1.0, latitude=45.0)
        far_east = make_place(id="far_east", longitude=10.0, latitude=45.0)

        tour = nearest_neighbor_tour([far_east, west, near_west])
        assert [p.id for p in tour] == ["west", "near_west", "far_east"]


class TestExtractFirstOpenHour:
    def test_none_returns_none(self):
        assert extract_first_open_hour(None) is None

    def test_plain_24h_range(self):
        assert extract_first_open_hour("9:00-19:00") == 9

    def test_24h_with_day_prefix(self):
        assert extract_first_open_hour("Mon-Sat 19:30-22:30") == 19

    def test_multi_slot_uses_first_slot(self):
        assert extract_first_open_hour("Tues-Sun 12:00-14:30, 19:00-22:30") == 12

    def test_12h_am_format(self):
        assert extract_first_open_hour("8am-7pm") == 8

    def test_12h_pm_format_converts_to_24h(self):
        assert extract_first_open_hour("Tues-Sun 18:00-23:00") == 18

    def test_12h_noon_stays_twelve(self):
        assert extract_first_open_hour("12:30pm-6pm") == 12

    def test_12h_midnight_am_becomes_zero(self):
        assert extract_first_open_hour("12am-6am") == 0

    def test_vague_text_returns_none(self):
        assert extract_first_open_hour("Evenings") is None
        assert extract_first_open_hour("Morning only") is None

    def test_crosses_midnight_still_extracts_start(self):
        assert extract_first_open_hour("8:00-01:00") == 8


class TestIsEveningOnly:
    def test_hour_at_cutoff_is_evening_only(self, make_place):
        place = make_place(hours=f"{EVENING_CUTOFF_HOUR}:00-22:00")
        assert is_evening_only(place) is True

    def test_hour_before_cutoff_is_not_evening_only(self, make_place):
        place = make_place(hours=f"{EVENING_CUTOFF_HOUR - 1}:00-22:00")
        assert is_evening_only(place) is False

    def test_null_hours_is_not_evening_only(self, make_place):
        place = make_place(hours=None)
        assert is_evening_only(place) is False

    def test_vague_hours_is_not_evening_only(self, make_place):
        place = make_place(hours="Evenings")
        assert is_evening_only(place) is False


class TestReorderEveningOnlyLast:
    def test_evening_only_moved_after_daytime(self, make_place):
        dinner = make_place(id="dinner", hours="19:30-22:30")
        museum = make_place(id="museum", hours="9:00-19:00")

        result = reorder_evening_only_last([dinner, museum])
        assert [p.id for p in result] == ["museum", "dinner"]

    def test_stable_within_daytime_group(self, make_place):
        a = make_place(id="a", hours="9:00-19:00")
        b = make_place(id="b", hours="10:00-18:00")

        result = reorder_evening_only_last([a, b])
        assert [p.id for p in result] == ["a", "b"]

    def test_stable_within_evening_group(self, make_place):
        a = make_place(id="a", hours="19:00-23:00")
        b = make_place(id="b", hours="20:00-23:00")

        result = reorder_evening_only_last([a, b])
        assert [p.id for p in result] == ["a", "b"]

    def test_unconstrained_places_stay_with_daytime_group(self, make_place):
        dinner = make_place(id="dinner", hours="19:30-22:30")
        unconstrained = make_place(id="unconstrained", hours=None)

        result = reorder_evening_only_last([dinner, unconstrained])
        assert [p.id for p in result] == ["unconstrained", "dinner"]


class TestEveningOnlyWarnings:
    def test_no_warning_for_single_evening_place(self, make_place):
        museum = make_place(id="museum", hours="9:00-19:00")
        dinner = make_place(id="dinner", hours="19:30-22:30")
        assert evening_only_warnings([museum, dinner]) == []

    def test_warning_for_adjacent_evening_only_pair(self, make_place):
        dinner_a = make_place(id="dinner_a", name="Osteria A", hours="19:30-22:30")
        dinner_b = make_place(id="dinner_b", name="Osteria B", hours="20:00-23:00")

        warnings = evening_only_warnings([dinner_a, dinner_b])
        assert len(warnings) == 1
        assert warnings[0].place_ids == ["dinner_a", "dinner_b"]

    def test_no_warning_when_evening_places_not_adjacent(self, make_place):
        dinner_a = make_place(id="dinner_a", hours="19:30-22:30")
        museum = make_place(id="museum", hours="9:00-19:00")
        dinner_b = make_place(id="dinner_b", hours="20:00-23:00")

        assert evening_only_warnings([dinner_a, museum, dinner_b]) == []

    def test_empty_and_single_place_produce_no_warnings(self, make_place):
        assert evening_only_warnings([]) == []
        assert evening_only_warnings([make_place()]) == []


class TestSplitIntoDays:
    def test_evenly_divisible_count(self, make_place):
        places = [make_place(id=f"p{i}") for i in range(9)]
        days = split_into_days(places)
        assert [len(day) for day in days] == [3, 3, 3]

    def test_remainder_goes_to_earlier_days(self, make_place):
        places = [make_place(id=f"p{i}") for i in range(8)]
        days = split_into_days(places)
        assert [len(day) for day in days] == [3, 3, 2]

    def test_remainder_of_one(self, make_place):
        places = [make_place(id=f"p{i}") for i in range(7)]
        days = split_into_days(places)
        assert [len(day) for day in days] == [3, 2, 2]

    def test_preserves_order_within_and_across_days(self, make_place):
        places = [make_place(id=f"p{i}") for i in range(6)]
        days = split_into_days(places)
        flattened = [p.id for day in days for p in day]
        assert flattened == [p.id for p in places]

    def test_always_returns_three_days(self, make_place):
        places = [make_place(id=f"p{i}") for i in range(2)]
        days = split_into_days(places)
        assert len(days) == 3
