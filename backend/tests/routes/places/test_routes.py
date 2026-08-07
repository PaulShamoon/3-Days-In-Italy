from fastapi.testclient import TestClient

from backend.routes.places.routes import router
from backend.tests.conftest import build_test_app


def _client(places):
    return TestClient(build_test_app(router, places))


class TestGetPlaces:
    def test_returns_only_places_in_requested_region(self, make_place):
        tuscany_places = [make_place(id="place_001", region="Tuscany")]
        lazio_places = [make_place(id="place_005", region="Lazio")]

        response = _client(tuscany_places + lazio_places).get("/places", params={"region": "Tuscany"})

        assert response.status_code == 200
        returned_ids = [p["id"] for p in response.json()["places"]]
        assert returned_ids == ["place_001"]

    def test_returns_full_place_details(self, make_place):
        place = make_place(
            id="place_001", name="Uffizi Gallery", region="Tuscany",
            hours="9:00-19:00", latitude=43.77, longitude=11.25,
        )

        response = _client([place]).get("/places", params={"region": "Tuscany"})

        body = response.json()["places"][0]
        assert body["name"] == "Uffizi Gallery"
        assert body["hours"] == "9:00-19:00"
        assert body["latitude"] == 43.77
        assert body["longitude"] == 11.25

    def test_unknown_region_returns_400(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]

        response = _client(places).get("/places", params={"region": "Not A Region"})

        assert response.status_code == 400

    def test_missing_region_param_returns_422(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]

        response = _client(places).get("/places")

        assert response.status_code == 422
