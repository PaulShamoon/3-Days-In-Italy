from unittest.mock import patch

import pytest

from backend.models import BusyLevel
from backend.llm import llm
from backend.tests.conftest import make_tool_use_response


class TestPlaceSummary:
    def test_trims_to_expected_fields(self, make_place):
        place = make_place(
            id="place_001", name="Uffizi Gallery", type="museum",
            tags=["art", "renaissance"], description="A famous museum.",
            rating=4.8, price_range="$$",
        )
        assert llm._place_summary(place) == {
            "id": "place_001",
            "name": "Uffizi Gallery",
            "type": "museum",
            "tags": ["art", "renaissance"],
            "description": "A famous museum.",
            "rating": 4.8,
            "price_range": "$$",
        }

    def test_excludes_map_and_scheduling_fields(self, make_place):
        place = make_place(latitude=1.0, longitude=2.0, hours="9:00-19:00")
        summary = llm._place_summary(place)
        assert "latitude" not in summary
        assert "longitude" not in summary
        assert "hours" not in summary
        assert "seasonal_notes" not in summary
        assert "booking_required" not in summary


class TestLlmPickRegion:
    def test_returns_region_picked_by_llm(self):
        fake_response = make_tool_use_response("pick_region", {"region": "Tuscany"})
        with patch.object(llm.client.messages, "create", return_value=fake_response) as mock_create:
            region = llm.llm_pick_region("a relaxing wine trip", ["Tuscany", "Lazio"])

        assert region == "Tuscany"
        mock_create.assert_called_once()

    def test_raises_if_llm_picks_region_outside_available_list(self):
        fake_response = make_tool_use_response("pick_region", {"region": "Not A Region"})
        with patch.object(llm.client.messages, "create", return_value=fake_response):
            with pytest.raises(ValueError):
                llm.llm_pick_region("a relaxing wine trip", ["Tuscany", "Lazio"])

    def test_never_calls_real_api(self):
        fake_response = make_tool_use_response("pick_region", {"region": "Lazio"})
        with patch.object(llm.client.messages, "create", return_value=fake_response) as mock_create:
            llm.llm_pick_region("Rome please", ["Tuscany", "Lazio"])
        assert mock_create.called
        # If this ever hits the real network, there's no API key in test
        # env to authenticate with, so a mock miss would fail loudly.


class TestLlmSelectPlaces:
    def test_returns_selections_from_llm_response(self, sample_places):
        fake_selections = [{"id": "place_001", "reason": "Great museum."}]
        fake_response = make_tool_use_response("select_places", {"selections": fake_selections})
        with patch.object(llm.client.messages, "create", return_value=fake_response) as mock_create:
            result = llm.llm_select_places("art lover", sample_places, BusyLevel.BUSY)

        assert result == fake_selections
        mock_create.assert_called_once()


class TestLlmRefinePlaces:
    def test_returns_selections_from_llm_response(self, sample_places):
        fake_selections = [{"id": "place_003", "reason": "Adds a dinner spot."}]
        fake_response = make_tool_use_response("select_places", {"selections": fake_selections})
        with patch.object(llm.client.messages, "create", return_value=fake_response) as mock_create:
            result = llm.llm_refine_places(
                "add a nice dinner place",
                sample_places,
                ["place_001", "place_002"],
                "Tuscany",
                BusyLevel.CHILL,
            )

        assert result == fake_selections
        mock_create.assert_called_once()
