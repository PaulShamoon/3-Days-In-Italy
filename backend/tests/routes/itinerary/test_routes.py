from fastapi.testclient import TestClient

from backend.routes.itinerary.routes import router
from backend.tests.conftest import build_test_app


def _client(places):
    return TestClient(build_test_app(router, places))


class TestItineraryRoute:
    def test_unknown_place_id_returns_400(self, make_place):
        places = [make_place(id="place_001")]
        response = _client(places).post("/itinerary", json={
            "place_ids": ["place_001", "does_not_exist"],
            "busy_level": "chill",
        })
        assert response.status_code == 400

    def test_below_minimum_count_returns_400(self, make_place):
        # Chill requires 2 * TRIP_LENGTH_DAYS (3) = 6 minimum.
        places = [make_place(id=f"place_{i:03d}") for i in range(1, 4)]
        response = _client(places).post("/itinerary", json={
            "place_ids": [p.id for p in places],
            "busy_level": "chill",
        })
        assert response.status_code == 400

    def test_duplicate_ids_count_toward_minimum_only_once(self, make_place):
        # 3 unique places repeated to fill 6 slots still falls short of
        # chill's minimum of 6 *unique* places.
        places = [make_place(id=f"place_{i:03d}") for i in range(1, 4)]
        place_ids = [p.id for p in places] * 2
        response = _client(places).post("/itinerary", json={
            "place_ids": place_ids,
            "busy_level": "chill",
        })
        assert response.status_code == 400

    def test_duplicate_ids_deduplicated_in_result(self, make_place):
        places = [
            make_place(id=f"place_{i:03d}", longitude=float(i), latitude=45.0)
            for i in range(1, 7)
        ]
        place_ids = [p.id for p in places] + [places[0].id]
        response = _client(places).post("/itinerary", json={
            "place_ids": place_ids,
            "busy_level": "chill",
        })

        assert response.status_code == 200
        all_returned_ids = [
            place["id"] for day in response.json()["days"] for place in day["places"]
        ]
        assert sorted(all_returned_ids) == sorted(p.id for p in places)

    def test_valid_request_returns_three_days(self, make_place):
        places = [
            make_place(id=f"place_{i:03d}", longitude=float(i), latitude=45.0)
            for i in range(1, 10)
        ]
        response = _client(places).post("/itinerary", json={
            "place_ids": [p.id for p in places],
            "busy_level": "chill",
        })

        assert response.status_code == 200
        body = response.json()
        assert len(body["days"]) == 3
        assert [d["day_number"] for d in body["days"]] == [1, 2, 3]

        all_returned_ids = [
            place["id"] for day in body["days"] for place in day["places"]
        ]
        assert sorted(all_returned_ids) == sorted(p.id for p in places)

    def test_evening_only_place_not_scheduled_first(self, make_place):
        dinner = make_place(
            id="dinner", name="Late Restaurant", hours="19:30-22:30",
            longitude=11.0, latitude=45.0,
        )
        daytime_places = [
            make_place(id=f"place_{i:03d}", hours="9:00-19:00",
                       longitude=float(i), latitude=45.0)
            for i in range(1, 9)
        ]
        places = [dinner] + daytime_places

        response = _client(places).post("/itinerary", json={
            "place_ids": [p.id for p in places],
            "busy_level": "chill",
        })

        body = response.json()
        day_containing_dinner = next(
            day for day in body["days"]
            if any(p["id"] == "dinner" for p in day["places"])
        )
        assert day_containing_dinner["places"][0]["id"] != "dinner"

    def test_adjacent_evening_only_places_produce_warning(self, make_place):
        dinner_a = make_place(
            id="dinner_a", name="Osteria A", hours="19:30-22:30",
            longitude=11.0, latitude=45.0,
        )
        dinner_b = make_place(
            id="dinner_b", name="Osteria B", hours="20:00-23:00",
            longitude=11.01, latitude=45.0,
        )
        others = [
            make_place(id=f"place_{i:03d}", hours="9:00-19:00",
                       longitude=float(i), latitude=45.0)
            for i in range(1, 5)
        ]
        places = [dinner_a, dinner_b] + others

        response = _client(places).post("/itinerary", json={
            "place_ids": [p.id for p in places],
            "busy_level": "chill",
        })

        body = response.json()
        all_warnings = [w for day in body["days"] for w in day["warnings"]]
        assert any(
            set(w["place_ids"]) == {"dinner_a", "dinner_b"} for w in all_warnings
        )
