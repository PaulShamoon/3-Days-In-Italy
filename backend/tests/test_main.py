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
            assert set(paths.keys()) == {"/select", "/refine", "/itinerary", "/places"}

    def test_computes_known_regions_once_at_startup(self):
        with TestClient(main.app) as client:
            places = client.app.state.places
            known_regions = client.app.state.known_regions
            assert known_regions == sorted({p.region for p in places})

    def test_computes_known_cities_and_city_to_region_once_at_startup(self):
        with TestClient(main.app) as client:
            places = client.app.state.places
            assert client.app.state.known_cities == sorted({p.city for p in places})
            city_to_region = client.app.state.city_to_region
            assert all(city_to_region[p.city] == p.region for p in places)

    def test_computes_known_place_names_and_place_name_to_region_once_at_startup(self):
        with TestClient(main.app) as client:
            places = client.app.state.places
            assert client.app.state.known_place_names == sorted({p.name for p in places})
            place_name_to_region = client.app.state.place_name_to_region
            assert all(place_name_to_region[p.name] == p.region for p in places)
