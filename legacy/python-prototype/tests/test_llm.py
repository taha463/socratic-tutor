"""Unit tests for the LLM multi-provider and structured response generation."""

from __future__ import annotations

import pytest
from pydantic import BaseModel, Field

from core.llm import (
    MockLLMProvider,
    get_llm_client,
)


class SampleModel(BaseModel):
    summary: str
    confidence: float = Field(ge=0.0, le=1.0)
    tags: list[str]


def test_mock_llm_defaults():
    """Verify that MockLLMProvider returns plausible contextual completions."""
    provider = MockLLMProvider()

    # Diagnostician contextual response
    diag_resp = provider.complete(
        messages=[{"role": "learner", "content": "I am completely stuck on this!"}],
        system="You are the Diagnostician agent.",
    )
    assert "STUCK" in diag_resp.content or "frustration" in diag_resp.content

    # Critic leak check response
    critic_resp = provider.complete(
        messages=[{"role": "user", "content": "The answer is return n * factorial(n-1)"}],
        system="You are the Critic agent checking for leaks.",
    )
    assert "leak" in critic_resp.content.lower() or "passed" in critic_resp.content.lower()


def test_mock_llm_enqueue():
    """Verify that queued responses are popped in FIFO order."""
    provider = MockLLMProvider()
    provider.enqueue_response("First queued response")
    provider.enqueue_response("Second queued response")

    r1 = provider.complete([{"role": "user", "content": "Hello"}])
    assert r1.content == "First queued response"

    r2 = provider.complete([{"role": "user", "content": "Hello again"}])
    assert r2.content == "Second queued response"


def test_complete_structured():
    """Verify structured parsing into Pydantic schema."""
    provider = MockLLMProvider()
    expected = SampleModel(summary="Test run", confidence=0.95, tags=["fast", "clean"])
    provider.enqueue_response(expected)

    result = provider.complete_structured(
        schema=SampleModel,
        messages=[{"role": "user", "content": "Analyze this"}],
        system="Analyze",
    )
    assert result.summary == "Test run"
    assert result.confidence == 0.95
    assert result.tags == ["fast", "clean"]


def test_complete_structured_invalid_json():
    """Verify ValueError is raised when LLM returns invalid JSON."""
    provider = MockLLMProvider(default_response="Not valid json at all")

    with pytest.raises(ValueError, match="Failed to parse structured LLM response"):
        provider.complete_structured(
            schema=SampleModel,
            messages=[{"role": "user", "content": "Analyze"}],
        )


def test_get_llm_client_factory(monkeypatch):
    """Verify factory provider selection and fallbacks."""
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    client = get_llm_client()
    assert isinstance(client, MockLLMProvider)

    # Provider override parameter
    client_mock = get_llm_client("mock")
    assert isinstance(client_mock, MockLLMProvider)
