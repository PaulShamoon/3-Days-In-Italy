import pytest

from backend.models import BusyLevel
from backend.llm.utils import (
    target_count_description,
    extract_tool_input
)
from backend.tests.conftest import make_tool_use_response


class TestTargetCountDescription:
    def test_chill_range(self):
        assert target_count_description(BusyLevel.CHILL) == "6-9"

    def test_busy_range(self):
        assert target_count_description(BusyLevel.BUSY) == "12-15"

    def test_packed_has_no_upper_bound(self):
        assert target_count_description(BusyLevel.PACKED) == "18+"


class TestExtractToolInput:
    def test_returns_input_of_matching_block(self):
        response = make_tool_use_response("pick_region", {"region": "Tuscany"})
        assert extract_tool_input(response, "pick_region") == {"region": "Tuscany"}

    def test_finds_matching_block_among_multiple(self):
        block_a = make_tool_use_response("select_places", {"selections": []}).content[0]
        block_b = make_tool_use_response("pick_region", {"region": "Lazio"}).content[0]
        response = type("Response", (), {"content": [block_a, block_b]})()
        assert extract_tool_input(response, "pick_region") == {"region": "Lazio"}

    def test_raises_when_no_matching_block(self):
        response = make_tool_use_response("select_places", {"selections": []})
        with pytest.raises(ValueError):
            extract_tool_input(response, "pick_region")

    def test_raises_when_content_empty(self):
        response = type("Response", (), {"content": []})()
        with pytest.raises(ValueError):
            extract_tool_input(response, "pick_region")
