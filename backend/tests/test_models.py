import pytest
from pydantic import ValidationError

from backend.models import PromptText, PROMPT_MIN_LENGTH


class TestPromptText:
    def test_rejects_prompt_shorter_than_minimum(self):
        with pytest.raises(ValidationError):
            PromptText(text="the")

    def test_accepts_prompt_at_exactly_the_minimum(self):
        text = "x" * PROMPT_MIN_LENGTH
        assert PromptText(text=text).text == text

    def test_rejects_whitespace_padded_short_text(self):
        # Real content is well under the minimum; padding shouldn't count.
        with pytest.raises(ValidationError):
            PromptText(text="   the   " + " " * 20)

    def test_strips_leading_and_trailing_whitespace(self):
        result = PromptText(text="  wine and quiet historic towns  ")
        assert result.text == "wine and quiet historic towns"

    def test_rejects_empty_string(self):
        with pytest.raises(ValidationError):
            PromptText(text="")

    def test_rejects_over_max_length(self):
        with pytest.raises(ValidationError):
            PromptText(text="x" * 501)
