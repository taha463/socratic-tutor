"""Unit tests for the pedagogical Hint Ladder."""

from __future__ import annotations

from core.ladder import HintLadder


def test_ladder_initial_state():
    """Verify default initial rung is 1 with 0 failures."""
    ladder = HintLadder()
    assert ladder.current_rung == 1
    assert ladder.definition.name == "Probe"
    assert not ladder.definition.allows_direct_answer


def test_ladder_escalation_after_two_failures():
    """Verify rung escalates after consecutive failures reach threshold (2)."""
    ladder = HintLadder(escalation_threshold=2)
    assert ladder.current_rung == 1

    # First failure -> stays on rung 1
    new_rung = ladder.update(is_success=False)
    assert new_rung == 1
    assert ladder.consecutive_failures == 1

    # Second failure -> escalates to rung 2
    new_rung = ladder.update(is_success=False)
    assert new_rung == 2
    assert ladder.consecutive_failures == 0


def test_ladder_escalation_on_high_frustration():
    """Verify immediate escalation when frustration exceeds 0.7."""
    ladder = HintLadder()
    assert ladder.current_rung == 1

    new_rung = ladder.update(is_success=False, frustration=0.85)
    assert new_rung == 2
    assert ladder.definition.name == "Narrow Question"


def test_ladder_max_turns_per_rung():
    """Verify rung escalates if learner spends more than 3 turns on same rung."""
    ladder = HintLadder(max_turns_per_rung=3, escalation_threshold=5)
    assert ladder.current_rung == 1

    # Turn 1
    ladder.update(is_success=False)
    # Turn 2
    ladder.update(is_success=False)
    # Turn 3 -> exceeds max turns on rung, escalates
    new_rung = ladder.update(is_success=False)
    assert new_rung == 2


def test_ladder_deescalation_on_success():
    """Verify ladder fades scaffolding (de-escalates) after learner success."""
    ladder = HintLadder(current_rung=4)

    new_rung = ladder.update(is_success=True)
    assert new_rung == 3
    assert ladder.consecutive_failures == 0

    new_rung = ladder.update(is_success=True)
    assert new_rung == 2


def test_ladder_boundary_limits():
    """Verify ladder stays strictly within rungs 1 to 7."""
    ladder = HintLadder(current_rung=7)
    # Attempting to escalate beyond 7
    new_rung = ladder.update(is_success=False, frustration=0.9)
    assert new_rung == 7

    ladder_low = HintLadder(current_rung=1)
    # Attempting to de-escalate below 1
    new_rung = ladder_low.update(is_success=True)
    assert new_rung == 1


def test_ladder_diagnostician_recommendation():
    """Verify Diagnostician can recommend initial placement (e.g. beginner at rung 3)."""
    ladder = HintLadder(current_rung=1)
    new_rung = ladder.update(is_success=False, recommended_rung=3)
    assert new_rung == 3

