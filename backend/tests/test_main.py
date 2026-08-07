from fastapi.testclient import TestClient

from backend.models import Place
import backend.main as main


class TestLifespan:
    def test_loads_and_validates_places_on_startup(self):
        with TestClient(main.app) as client:
            places = client.app.state.places
            assert len(places) > 0
            assert all(isinstance(p, Place) for p in places)

    def test_registers_select_refine_itinerary_routes(self):
        with TestClient(main.app) as client:
            paths = client.get("/openapi.json").json()["paths"]
            assert set(paths.keys()) == {"/select", "/refine", "/itinerary"}
