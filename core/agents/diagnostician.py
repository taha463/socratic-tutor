"""Diagnostician Agent for Socratic Tutor v2.

Monitors cognitive state, affective signals, frustration, and recommends hint ladder placement.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from core.llm import BaseLLMProvider, get_llm_client

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "diagnostician.txt"

LearnerState = Literal["LEARNING", "STUCK", "MASTERY", "COPYING_SUSPECTED"]
LearnerLevel = Literal["beginner", "intermediate", "advanced"]


class DiagnosticResult(BaseModel):
    """Structured assessment produced by the Diagnostician."""

    level: LearnerLevel = Field(
        default="beginner",
        description="Assessed learner competence level.",
    )
    frustration: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Estimated frustration from 0.0 (calm) to 1.0 (distressed).",
    )
    state: LearnerState = Field(
        default="LEARNING",
        description="Assessed pedagogical state.",
    )
    recommended_rung: int = Field(
        default=1,
        ge=1,
        le=7,
        description="Recommended starting or active rung on the hint ladder.",
    )
    reasoning: str = Field(
        ...,
        description="Diagnostic explanation for this turn.",
    )
    is_diagnostic_active: bool = Field(
        default=False,
        description="True if the learner is currently going through the 3-question diagnostic.",
    )
    diagnostic_step: int = Field(
        default=0,
        description="Current step of the 3-question diagnostic (1, 2, 3 or 0 if inactive).",
    )


class DiagnosticianAgent:
    """Evaluates learner turns and behavioral telemetry to steer pedagogical strategy."""

    def __init__(self, llm: Optional[BaseLLMProvider] = None) -> None:
        self.llm = llm or get_llm_client()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.base_prompt = f.read()

    def diagnose(
        self,
        session_id: str,
        learner_message: str,
        signals: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
        mastery_score: Optional[float] = None,
        prior_turns_count: int = 0,
    ) -> DiagnosticResult:
        """Evaluate learner state using LLM with deterministic behavioral heuristic overrides."""
        signals = signals or {}
        history = history or []

        # Layer 1: Deterministic behavioral heuristics
        heuristic_state: Optional[LearnerState] = None
        heuristic_frustration_boost = 0.0
        heuristic_rung: Optional[int] = None
        heuristic_notes: List[str] = []

        # Signal 1: Large paste detected
        paste_len = signals.get("pasted_length", 0)
        is_paste = signals.get("paste_event", False) or paste_len > 80
        if is_paste:
            heuristic_state = "COPYING_SUSPECTED"
            heuristic_rung = 1
            heuristic_notes.append("Large paste detected: probe conceptual comprehension.")

        # Signal 2: Instant hint request without attempt
        if signals.get("instant_hint_request", False):
            heuristic_rung = 1
            heuristic_notes.append("Instant hint requested without attempt: step back to initial probe.")

        # Signal 3: Long idle / typing speed collapse
        idle_time = signals.get("idle_seconds", 0.0)
        if idle_time > 45.0:
            heuristic_frustration_boost += 0.4
            heuristic_rung = 4  # Offer visual/smaller question
            heuristic_notes.append(f"Extended idle time ({idle_time}s): high cognitive friction, offer visual.")

        # Signal 4: Rapid wrong attempts
        if signals.get("rapid_wrong_attempts", 0) >= 3:
            heuristic_state = "STUCK"
            heuristic_frustration_boost += 0.3
            heuristic_notes.append("Rapid repeated failed attempts: escalate ladder.")

        # Check for first-session 3-question diagnostic
        is_diagnostic_active = False
        diagnostic_step = 0
        if prior_turns_count < 3 and mastery_score is None:
            is_diagnostic_active = True
            diagnostic_step = prior_turns_count + 1

        # Layer 2: LLM assessment
        system_prompt = (
            f"{self.base_prompt}\n\n"
            f"OBSERVED TELEMETRY:\n"
            f"- Prior Turns in Session: {prior_turns_count}\n"
            f"- Concept Mastery: {mastery_score if mastery_score is not None else 'Unassessed'}\n"
            f"- Signals: {signals}\n"
            f"- Diagnostic Active: {is_diagnostic_active} (Step {diagnostic_step})\n"
        )
        if heuristic_notes:
            system_prompt += f"- Behavioral Heuristic Flags: {'; '.join(heuristic_notes)}\n"

        messages = list(history)
        messages.append({"role": "learner", "content": learner_message})

        try:
            diag = self.llm.complete_structured(
                schema=DiagnosticResult,
                messages=messages,
                system=system_prompt,
                temperature=0.1,
            )
        except Exception:
            # Fallback heuristic diagnosis
            diag = DiagnosticResult(
                level="beginner",
                frustration=min(1.0, 0.2 + heuristic_frustration_boost),
                state=heuristic_state or ("STUCK" if heuristic_frustration_boost > 0.5 else "LEARNING"),
                recommended_rung=heuristic_rung or (4 if heuristic_frustration_boost > 0.5 else 1),
                reasoning="; ".join(heuristic_notes) or "Standard conversational assessment.",
            )

        # Merge heuristic overrides with LLM output
        final_state = heuristic_state or diag.state
        final_frustration = min(1.0, max(0.0, diag.frustration + heuristic_frustration_boost))
        final_rung = heuristic_rung or diag.recommended_rung

        # If frustration is high, ensure rung escalates to visual or analogy
        if final_frustration > 0.7 and final_rung < 3:
            final_rung = 4

        return DiagnosticResult(
            level=diag.level,
            frustration=final_frustration,
            state=final_state,
            recommended_rung=final_rung,
            reasoning=f"{diag.reasoning} {' '.join(heuristic_notes)}".strip(),
            is_diagnostic_active=is_diagnostic_active,
            diagnostic_step=diagnostic_step,
        )
