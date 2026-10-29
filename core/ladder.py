"""Pedagogical Hint Ladder implementation for Socratic Tutor v2.

Rungs:
1. Probe: ask what the learner already thinks or tried.
2. Narrow question: a smaller, more concrete question.
3. Analogy / ELI5: everyday analogy, then ask them to map it back.
4. Visual with blanks: diagram or trace with missing pieces.
5. Worked example of a similar problem: solve a different problem fully, then ask them to apply it.
6. Partial reveal: reveal the key step with explanation, ask them to finish.
7. Full explanation + check: only after repeated failure; then immediately ask a transfer question to verify understanding.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class RungDefinition:
    level: int
    name: str
    pedagogy: str
    allows_direct_answer: bool


RUNG_DEFINITIONS: Dict[int, RungDefinition] = {
    1: RungDefinition(
        level=1,
        name="Probe",
        pedagogy="Ask what the learner already thinks or has tried. Never give hints yet.",
        allows_direct_answer=False,
    ),
    2: RungDefinition(
        level=2,
        name="Narrow Question",
        pedagogy="Ask a smaller, highly focused, concrete sub-question.",
        allows_direct_answer=False,
    ),
    3: RungDefinition(
        level=3,
        name="Analogy / ELI5",
        pedagogy="Provide an intuitive everyday real-world analogy and ask the learner to map it back.",
        allows_direct_answer=False,
    ),
    4: RungDefinition(
        level=4,
        name="Visual with Blanks",
        pedagogy="Present a diagram, execution trace, or structure with critical blanks or prediction requests.",
        allows_direct_answer=False,
    ),
    5: RungDefinition(
        level=5,
        name="Worked Example of Similar Problem",
        pedagogy="Walk through an isomorphic but different problem end-to-end, then ask how it maps to this problem.",
        allows_direct_answer=False,
    ),
    6: RungDefinition(
        level=6,
        name="Partial Reveal",
        pedagogy="Reveal the crucial intermediate step or mechanic with explanation, and ask learner to complete the rest.",
        allows_direct_answer=False,
    ),
    7: RungDefinition(
        level=7,
        name="Full Explanation + Check",
        pedagogy="Provide full conceptual explanation followed immediately by a transfer question to check true comprehension.",
        allows_direct_answer=True,
    ),
}


class HintLadder:
    """Manages hint progression, escalation, and de-escalation."""

    def __init__(
        self,
        current_rung: int = 1,
        consecutive_failures: int = 0,
        turns_on_current_rung: int = 0,
        escalation_threshold: int = 2,
        max_turns_per_rung: int = 3,
        frustration_threshold: float = 0.7,
    ) -> None:
        self.current_rung = max(1, min(7, current_rung))
        self.consecutive_failures = consecutive_failures
        self.turns_on_current_rung = turns_on_current_rung
        self.escalation_threshold = escalation_threshold
        self.max_turns_per_rung = max_turns_per_rung
        self.frustration_threshold = frustration_threshold

    @property
    def definition(self) -> RungDefinition:
        return RUNG_DEFINITIONS[self.current_rung]

    def update(
        self,
        is_success: bool,
        frustration: float = 0.0,
        recommended_rung: Optional[int] = None,
    ) -> int:
        """Update ladder position based on learner outcome, frustration, or diagnostician recommendation.

        Returns:
            The new active rung level (1-7).
        """
        self.turns_on_current_rung += 1

        # Check explicit recommendation from Diagnostician (e.g. for complete beginners starting at rung 3 or 4)
        if recommended_rung is not None and recommended_rung != self.current_rung:
            # If diagnostician suggests stepping up or initial placement
            if self.turns_on_current_rung == 1 or abs(recommended_rung - self.current_rung) >= 2:
                self.current_rung = max(1, min(7, recommended_rung))
                self.turns_on_current_rung = 1
                self.consecutive_failures = 0
                return self.current_rung

        if is_success:
            # Learner succeeded: reset failures, de-escalate (fade scaffolding)
            self.consecutive_failures = 0
            if self.current_rung > 1:
                self.current_rung = max(1, self.current_rung - 1)
                self.turns_on_current_rung = 1
            return self.current_rung

        # Learner failed or is stuck
        self.consecutive_failures += 1

        # Escalation conditions:
        # 1. Consecutive failures >= threshold (default 2)
        # 2. High frustration (> 0.7)
        # 3. Stuck on the same rung for more than max_turns_per_rung (default 3)
        should_escalate = (
            self.consecutive_failures >= self.escalation_threshold
            or frustration >= self.frustration_threshold
            or self.turns_on_current_rung >= self.max_turns_per_rung
        )

        if should_escalate and self.current_rung < 7:
            self.current_rung = min(7, self.current_rung + 1)
            self.consecutive_failures = 0
            self.turns_on_current_rung = 1

        return self.current_rung

    def reset(self, rung: int = 1) -> None:
        """Reset ladder to specified initial rung."""
        self.current_rung = max(1, min(7, rung))
        self.consecutive_failures = 0
        self.turns_on_current_rung = 0
