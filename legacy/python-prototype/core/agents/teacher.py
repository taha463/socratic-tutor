"""Teacher Agent for Socratic Tutor v2."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from core.llm import BaseLLMProvider, get_llm_client

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "teacher.txt"


class TeacherDraft(BaseModel):
    """Structured draft output from the Teacher Agent."""

    reply_text: str = Field(
        ...,
        description="The teacher's pedagogical response culminating in exactly one question.",
    )
    single_question: str = Field(
        ...,
        description="The explicit single question posed to the learner.",
    )
    needs_visual: bool = Field(
        default=False,
        description="Whether a visual aid (diagram, analogy, trace) should accompany this reply.",
    )
    visual_concept: Optional[str] = Field(
        default=None,
        description="Concept for the visualizer, if needed.",
    )
    visual_type: Optional[str] = Field(
        default=None,
        description="Requested visual skill type ('eli5', 'diagram', 'trace', 'analogy', 'plot').",
    )


class TeacherAgent:
    """Generates pedagogical replies aligned with the active hint ladder rung."""

    def __init__(self, llm: Optional[BaseLLMProvider] = None) -> None:
        self.llm = llm or get_llm_client()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.base_prompt = f.read()

    def draft(
        self,
        topic: str,
        learner_message: str,
        history: List[Dict[str, str]],
        rung: int,
        frustration: float = 0.0,
        learner_state: str = "LEARNING",
        behavioral_signals: Optional[Dict[str, Any]] = None,
        rewrite_instructions: Optional[str] = None,
        ground_truth: Optional[str] = None,
    ) -> TeacherDraft:
        """Draft a response to the learner under the active hint ladder rung."""
        system_prompt = (
            f"{self.base_prompt}\n\n"
            f"CURRENT CONTEXT:\n"
            f"- Topic: {topic}\n"
            f"- Active Ladder Rung: Rung {rung}\n"
            f"- Learner State: {learner_state}\n"
            f"- Frustration Level (0.0 to 1.0): {frustration:.2f}\n"
            f"- Behavioral Signals: {behavioral_signals or {}}\n"
        )
        if ground_truth:
            system_prompt += f"- Target Concept / Ground Truth (DO NOT LEAK): {ground_truth}\n"

        if rewrite_instructions:
            system_prompt += (
                f"\nCRITIC REWRITE INSTRUCTIONS FROM PREVIOUS DRAFT:\n"
                f"{rewrite_instructions}\n"
                f"You MUST modify your reply to address every issue above.\n"
            )

        messages = list(history)
        messages.append({"role": "learner", "content": learner_message})

        return self.llm.complete_structured(
            schema=TeacherDraft,
            messages=messages,
            system=system_prompt,
            temperature=0.4,
        )
