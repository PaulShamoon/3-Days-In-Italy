from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.routes.selection.routes import router
from backend.tests.conftest import build_test_app


def _client(places):
    return TestClient(build_test_app(router, places))


class TestSelectRoute:
    def test_valid_region_hint_skips_region_resolution(self, make_place):
        places = [make_place(id=f"place_{i:03d}", region="Tuscany") for i in range(1, 7)]
        selections = [{"id": p.id, "reason": "fits"} for p in places]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=selections) as mock_select, \
             patch("backend.routes.selection.routes.llm_pick_region") as mock_pick:
            response = _client(places).post("/select", json={
                "prompt": {"text": "wine and quiet towns"},
                "busy_level": "chill",
                "region_hint": "Tuscany",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["region"] == "Tuscany"
        assert body["matched_count"] == 6
        assert body["target_count_min"] == 6
        assert body["target_count_max"] == 9
        assert body["insufficient_matches"] is False
        mock_pick.assert_not_called()
        mock_select.assert_called_once()

    def test_invalid_region_hint_falls_back_to_string_match(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=[]), \
             patch("backend.routes.selection.routes.llm_pick_region") as mock_pick:
            response = _client(places).post("/select", json={
                "prompt": {"text": "I want to visit Tuscany"},
                "busy_level": "chill",
                "region_hint": "Not A Real Region",
            })

        assert response.status_code == 200
        assert response.json()["region"] == "Tuscany"
        mock_pick.assert_not_called()

    def test_no_hint_no_match_falls_through_to_llm(self, make_place):
        places = [make_place(id="place_005", region="Lazio")]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=[]), \
             patch("backend.routes.selection.routes.llm_pick_region", return_value="Lazio") as mock_pick:
            response = _client(places).post("/select", json={
                "prompt": {"text": "a relaxing trip with great food"},
                "busy_level": "chill",
            })

        assert response.status_code == 200
        assert response.json()["region"] == "Lazio"
        mock_pick.assert_called_once()

    def test_insufficient_matches_flagged_below_minimum(self, make_place):
        places = [make_place(id=f"place_{i:03d}", region="Tuscany") for i in range(1, 3)]
        selections = [{"id": p.id, "reason": "fits"} for p in places]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=selections):
            response = _client(places).post("/select", json={
                "prompt": {"text": "wine"},
                "busy_level": "chill",
                "region_hint": "Tuscany",
            })

        body = response.json()
        assert body["matched_count"] == 2
        assert body["target_count_min"] == 6
        assert body["insufficient_matches"] is True

    def test_trims_when_llm_overselects_past_max(self, make_place):
        places = [make_place(id=f"place_{i:03d}", region="Tuscany") for i in range(1, 21)]
        selections = [{"id": p.id, "reason": "fits"} for p in places]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=selections):
            response = _client(places).post("/select", json={
                "prompt": {"text": "wine"},
                "busy_level": "busy",
                "region_hint": "Tuscany",
            })

        body = response.json()
        assert body["matched_count"] == 20
        assert body["target_count_max"] == 15
        assert len(body["selected"]) == 15

    def test_drops_invalid_ids_from_llm_response(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]
        selections = [
            {"id": "place_001", "reason": "fits"},
            {"id": "place_999", "reason": "hallucinated"},
        ]

        with patch("backend.routes.selection.routes.llm_select_places", return_value=selections):
            response = _client(places).post("/select", json={
                "prompt": {"text": "wine"},
                "busy_level": "chill",
                "region_hint": "Tuscany",
            })

        body = response.json()
        assert body["matched_count"] == 1
        assert [s["id"] for s in body["selected"]] == ["place_001"]


class TestRefineRoute:
    def test_out_of_region_request_skips_llm_call(self, make_place):
        places = [
            make_place(id="place_001", region="Tuscany"),
            make_place(id="place_005", region="Lazio"),
        ]

        with patch("backend.routes.selection.routes.llm_refine_places") as mock_refine:
            response = _client(places).post("/refine", json={
                "prompt": {"text": "actually let's add something in Lazio"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["out_of_region_request"] is True
        assert body["requested_region"] == "Lazio"
        assert body["selected"] == []
        mock_refine.assert_not_called()

    def test_out_of_region_request_via_city_mention_skips_llm_call(self, make_place):
        # Regression: "add the Colosseum in Rome" names a city, not a
        # region — a region-name-only check misses this, silently lets
        # the LLM decide, and the region lock stops being a hard
        # constraint. Rome -> Lazio must be caught here, code-only.
        places = [
            make_place(id="place_001", region="Tuscany", city="Florence"),
            make_place(id="place_005", region="Lazio", city="Rome"),
        ]

        with patch("backend.routes.selection.routes.llm_refine_places") as mock_refine:
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add the Colosseum in Rome"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["out_of_region_request"] is True
        assert body["requested_region"] == "Lazio"
        assert body["selected"] == []
        mock_refine.assert_not_called()

    def test_out_of_region_request_via_bare_place_name_skips_llm_call(self, make_place):
        # Regression: "add the Colosseum" alone (no "Rome", no "Lazio")
        # must still be caught — a city-only check misses a bare
        # landmark mention.
        places = [
            make_place(id="place_001", name="Palazzo Vecchio", region="Tuscany", city="Florence"),
            make_place(id="place_005", name="Colosseum", region="Lazio", city="Rome"),
        ]

        with patch("backend.routes.selection.routes.llm_refine_places") as mock_refine:
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add the Colosseum"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["out_of_region_request"] is True
        assert body["requested_region"] == "Lazio"
        assert body["selected"] == []
        mock_refine.assert_not_called()

    def test_city_mention_in_locked_region_does_not_trigger_out_of_region(self, make_place):
        places = [make_place(id="place_001", region="Tuscany", city="Florence")]
        selections = [{"id": "place_001", "reason": "still fits"}]

        with patch("backend.routes.selection.routes.llm_refine_places", return_value=selections) as mock_refine:
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add something else in Florence"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["out_of_region_request"] is False
        mock_refine.assert_called_once()

    def test_normal_refine_calls_llm_and_returns_selection(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]
        selections = [{"id": "place_001", "reason": "still fits"}]

        with patch("backend.routes.selection.routes.llm_refine_places", return_value=selections) as mock_refine:
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add a dinner spot"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert response.status_code == 200
        body = response.json()
        assert body["out_of_region_request"] is False
        assert body["selected"] == selections
        mock_refine.assert_called_once()

    def test_trims_when_llm_overselects_past_max(self, make_place):
        places = [make_place(id=f"place_{i:03d}", region="Tuscany") for i in range(1, 21)]
        selections = [{"id": p.id, "reason": "fits"} for p in places]

        with patch("backend.routes.selection.routes.llm_refine_places", return_value=selections):
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add more places"},
                "locked_region": "Tuscany",
                "current_place_ids": [],
                "busy_level": "busy",
            })

        assert len(response.json()["selected"]) == 15

    def test_drops_invalid_ids_from_llm_response(self, make_place):
        places = [make_place(id="place_001", region="Tuscany")]
        selections = [
            {"id": "place_001", "reason": "fits"},
            {"id": "place_999", "reason": "hallucinated"},
        ]

        with patch("backend.routes.selection.routes.llm_refine_places", return_value=selections):
            response = _client(places).post("/refine", json={
                "prompt": {"text": "add more places"},
                "locked_region": "Tuscany",
                "current_place_ids": ["place_001"],
                "busy_level": "chill",
            })

        assert [s["id"] for s in response.json()["selected"]] == ["place_001"]
