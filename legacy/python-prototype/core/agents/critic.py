"""Critic Agent for Socratic Tutor v2.

Acts as a synchronous quality gate on every Teacher draft before it reaches the learner.
Combines deterministic structural checks (heuristic guardrails) with LLM semantic evaluation.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from core.llm import BaseLLMProvider, get_llm_client

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "critic.txt"


class CriticVerdict(BaseModel):
    """Evaluation verdict produced by the Critic Agent."""

    passed: bool = Field(
        ...,
        description="True if the draft passes all pedagogical criteria, False if rewrite needed.",
    )
    leak_detected: bool = Field(
        default=False,
        description="True if draft prematurely reveals the final answer/solution on rungs 1-6.",
    )
    multiple_questions: bool = Field(
        default=False,
        description="True if draft asks more than one question.",
    )
    code_dump: bool = Field(
        default=False,
        description="True if draft provides complete executable solution code.",
    )
    issues: List[str] = Field(
        default_factory=list,
        description="List of pedagogical issues identified.",
    )
    rewrite_instructions: str = Field(
        default="",
        description="Precise guidance for the Teacher to fix the draft.",
    )


class CriticAgent:
    """Evaluates draft replies from the Teacher Agent."""

    def __init__(self, llm: Optional[BaseLLMProvider] = None) -> None:
        self.llm = llm or get_llm_client()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.base_prompt = f.read()

    def evaluate(
        self,
        draft_text: str,
        rung: int,
        ground_truth: Optional[str] = None,
        visual_metadata: Optional[Any] = None,
    ) -> CriticVerdict:
        """Evaluate a draft reply against answer leakage and pedagogical rules."""
        # Layer 1: Deterministic heuristic safety checks
        heuristic_issues: List[str] = []
        leak_detected = False
        multiple_questions = False
        code_dump = False

        # Count questions
        question_count = len(re.findall(r"\?", draft_text))
        if question_count > 1:
            multiple_questions = True
            heuristic_issues.append(f"Found {question_count} question marks. Violates One-Question Rule.")

        # Check for direct answer leak on rungs 1-6
        lower_draft = draft_text.lower()
        if rung < 7:
            leak_markers = [
                "the answer is",
                "here is the complete code",
                "here is the solution",
                "the solution is",
                "you can solve this by writing:",
                "def solve(",
            ]
            for marker in leak_markers:
                if marker in lower_draft:
                    leak_detected = True
                    heuristic_issues.append(f"Direct answer leak detected ('{marker}').")
                    break

            if ground_truth and len(ground_truth.strip()) > 5:
                clean_gt = ground_truth.strip().lower()
                # Check for verbatim ground truth phrase leak
                if clean_gt in lower_draft:
                    leak_detected = True
                    heuristic_issues.append(f"Ground truth solution '{clean_gt}' leaked in text.")

            # Code dump check: markdown code blocks with > 6 lines of code on early rungs
            code_blocks = re.findall(r"```(?:python)?(.*?)```", draft_text, flags=re.DOTALL)
            for block in code_blocks:
                lines = [line.strip() for line in block.splitlines() if line.strip()]
                # If code block has return or complete statements without blanks
                if len(lines) >= 4 and ("___" not in block and "..." not in block):
                    code_dump = True
                    heuristic_issues.append("Complete code snippet provided without blanks or scaffolding.")

        # Layer 2: Semantic evaluation via LLM
        system_prompt = (
            f"{self.base_prompt}\n\n"
            f"CONSTRAINTS FOR THIS TURN:\n"
            f"- Current Hint Ladder Rung: Rung {rung}\n"
            f"- Direct Answer Permitted: {'YES' if rung == 7 else 'NO (STRICTLY FORBIDDEN)'}\n"
        )
        if ground_truth:
            system_prompt += f"- Target Concept / Ground Truth Answer: {ground_truth}\n"
        if visual_metadata:
            system_prompt += f"- Visual Metadata: {visual_metadata}\n"

        user_content = f"DRAFT TO EVALUATE:\n{draft_text}"
        messages = [{"role": "user", "content": user_content}]

        try:
            llm_verdict = self.llm.complete_structured(
                schema=CriticVerdict,
                messages=messages,
                system=system_prompt,
                temperature=0.1,
            )
        except Exception:
            # Fallback to heuristic verdict if LLM structured parsing fails
            llm_verdict = CriticVerdict(
                passed=len(heuristic_issues) == 0,
                leak_detected=leak_detected,
                multiple_questions=multiple_questions,
                code_dump=code_dump,
                issues=heuristic_issues,
                rewrite_instructions="Simplify into a single question and remove any leaked answers." if heuristic_issues else "",
            )

        # Merge heuristic findings with LLM findings (defensive programming)
        all_issues = list(set(heuristic_issues + llm_verdict.issues))
        final_leak = leak_detected or llm_verdict.leak_detected
        final_mq = multiple_questions or llm_verdict.multiple_questions
        final_cd = code_dump or llm_verdict.code_dump
        final_passed = llm_verdict.passed and len(heuristic_issues) == 0 and not final_leak and not final_mq

        rewrite_instr = llm_verdict.rewrite_instructions
        if not rewrite_instr and all_issues:
            rewrite_instr = "; ".join(all_issues)

        return CriticVerdict(
            passed=final_passed,
            leak_detected=final_leak,
            multiple_questions=final_mq,
            code_dump=final_cd,
            issues=all_issues,
            rewrite_instructions=rewrite_instr,
        )
