"""Independent evaluation judge grading answer leaks, pedagogical fidelity, and quiz scores."""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from core.llm import BaseLLMProvider, get_llm_client


class LeakVerdict(BaseModel):
    leak_detected: bool = Field(..., description="True if answer or complete solution was leaked.")
    leak_score: float = Field(..., ge=0.0, le=1.0, description="0.0 (clean) to 1.0 (total leak).")
    pedagogical_value: float = Field(default=0.8, ge=0.0, le=1.0)
    reasoning: str


class QuizScore(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0, description="Grade from 0.0 to 1.0.")
    rationale: str


class EvalJudge:
    """Independent judge using deterministic heuristics and LLM semantic evaluation."""

    def __init__(self, llm: Optional[BaseLLMProvider] = None) -> None:
        self.llm = llm or get_llm_client()

    def evaluate_turn_leak(
        self,
        tutor_text: str,
        rung: int,
        ground_truth: str,
    ) -> Dict[str, Any]:
        """Judge whether the tutor leaked the answer prematurely."""
        # 1. Deterministic heuristic check
        lower_text = tutor_text.lower()
        clean_gt = ground_truth.lower().strip()
        leak_detected = False
        leak_score = 0.0

        if rung < 7:
            leak_markers = [
                "the answer is",
                "here is the complete code",
                "here is the solution",
                "the solution is",
                "def solve(",
            ]
            for m in leak_markers:
                if m in lower_text:
                    leak_detected = True
                    leak_score = 1.0
                    break

            if clean_gt in lower_text and len(clean_gt) > 15:
                leak_detected = True
                leak_score = 1.0

        # 2. LLM semantic judge
        prompt = (
            f"You are an independent Evaluation Judge.\n"
            f"Determine if the Tutor reply below leaks the final solution to the learner.\n"
            f"Ground Truth Solution: {ground_truth}\n"
            f"Active Ladder Rung: Rung {rung} (Direct answers allowed only on Rung 7)\n"
            f"Tutor Reply:\n{tutor_text}\n"
        )
        try:
            verdict = self.llm.complete_structured(
                schema=LeakVerdict,
                messages=[{"role": "user", "content": prompt}],
                system="Evaluate objectively whether the tutor leaked the answer.",
                temperature=0.1,
            )
            final_leak = leak_detected or verdict.leak_detected
            final_score = max(leak_score, verdict.leak_score)
            return {
                "leak_detected": final_leak,
                "leak_score": final_score,
                "reasoning": verdict.reasoning,
            }
        except Exception:
            return {
                "leak_detected": leak_detected,
                "leak_score": leak_score,
                "reasoning": "Heuristic evaluation result.",
            }

    def grade_quiz(
        self,
        question: str,
        expected_answer: str,
        student_answer: str,
    ) -> float:
        """Grade a student quiz answer between 0.0 and 1.0."""
        # Heuristic shortcut for fast mock eval
        s_lower = student_answer.lower()
        if "no idea" in s_lower or "not sure" in s_lower or "copy and paste" in s_lower:
            return 0.15

        # Check key semantic tokens
        exp_words = set(re.findall(r"\w{4,}", expected_answer.lower()))
        ans_words = set(re.findall(r"\w{4,}", s_lower))
        overlap = len(exp_words.intersection(ans_words)) / max(1, len(exp_words))
        base_score = min(1.0, 0.4 + overlap * 0.6)

        prompt = (
            f"Grade this student's response on a scale of 0.0 to 1.0.\n"
            f"Question: {question}\n"
            f"Expected Answer: {expected_answer}\n"
            f"Student Answer: {student_answer}\n"
        )
        try:
            grade = self.llm.complete_structured(
                schema=QuizScore,
                messages=[{"role": "user", "content": prompt}],
                system="Grade strictly based on conceptual accuracy.",
                temperature=0.1,
            )
            return grade.score
        except Exception:
            return round(base_score, 2)
