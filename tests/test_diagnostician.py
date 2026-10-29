"""Unit tests for the Diagnostician Agent and behavioral signal adaptation."""

from __future__ import annotations

from core.agents.diagnostician import DiagnosticianAgent
from core.llm import MockLLMProvider


def test_diagnostician_first_session_detection():
    """Verify that Diagnostician flags first-session diagnostic for new learners."""
    mock_llm = MockLLMProvider()
    diag = DiagnosticianAgent(mock_llm)

    res = diag.diagnose(
        session_id="first-sess",
        learner_message="I want to learn binary trees",
        signals={},
        history=[],
        mastery_score=None,
        prior_turns_count=0,
    )
    assert res.is_diagnostic_active
    assert res.diagnostic_step == 1


def test_diagnostician_paste_signal():
    """Verify large paste signal triggers COPYING_SUSPECTED and Rung 1 probe."""
    mock_llm = MockLLMProvider()
    diag = DiagnosticianAgent(mock_llm)

    res = diag.diagnose(
        session_id="paste-sess",
        learner_message="def binary_search(arr, target): return mid",
        signals={"paste_event": True, "pasted_length": 150},
        history=[{"role": "tutor", "content": "How would you search?"}],
        mastery_score=0.4,
        prior_turns_count=2,
    )
    assert res.state == "COPYING_SUSPECTED"
    assert res.recommended_rung == 1


def test_diagnostician_idle_signal_boosts_frustration():
    """Verify extended idle time increases frustration estimate and escalates rung."""
    mock_llm = MockLLMProvider()
    diag = DiagnosticianAgent(mock_llm)

    res = diag.diagnose(
        session_id="idle-sess",
        learner_message="I'm still thinking...",
        signals={"idle_seconds": 65.0},
        history=[{"role": "tutor", "content": "What is the next step?"}],
        mastery_score=0.3,
        prior_turns_count=3,
    )
    assert res.frustration >= 0.4
    assert res.recommended_rung >= 3


def test_diagnostician_rapid_attempts_stuck():
    """Verify rapid wrong attempts flags STUCK state."""
    mock_llm = MockLLMProvider()
    diag = DiagnosticianAgent(mock_llm)

    res = diag.diagnose(
        session_id="rapid-sess",
        learner_message="No wait is it 5? Or 10? Or 20?",
        signals={"rapid_wrong_attempts": 4},
        history=[{"role": "tutor", "content": "Guess the complexity."}],
        mastery_score=0.2,
        prior_turns_count=4,
    )
    assert res.state == "STUCK"
