"""Simulated learner personas for the evaluation harness."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BasePersona(ABC):
    """Abstract base class for simulated student personas."""

    name: str
    description: str

    @abstractmethod
    def respond(
        self,
        tutor_question: str,
        topic: str,
        ground_truth: str,
        turn_index: int,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Generate learner response and behavioral signals."""
        pass

    @abstractmethod
    def answer_quiz(self, question: str, is_post_test: bool, ground_truth: str) -> str:
        """Answer a pre-test or post-test question to measure learning gain."""
        pass


class BeginnerPersona(BasePersona):
    name = "beginner"
    description = "Knows little initially, gives tentative answers, learns well from analogies and diagrams."

    def respond(
        self,
        tutor_question: str,
        topic: str,
        ground_truth: str,
        turn_index: int,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if turn_index == 0:
            return {
                "message": f"I don't really know how {topic} works. Can you explain from the basics?",
                "signals": {"idle_seconds": 15.0},
            }
        elif turn_index == 1:
            return {
                "message": "Is it related to repeating or dividing things?",
                "signals": {"idle_seconds": 22.0},
            }
        else:
            return {
                "message": "Oh! Looking at that example/diagram, I see that we stop when we reach the base boundary condition.",
                "signals": {"idle_seconds": 10.0},
            }

    def answer_quiz(self, question: str, is_post_test: bool, ground_truth: str) -> str:
        if not is_post_test:
            return "I am not sure, maybe it just keeps running forever until something crashes?"
        return f"It stops when it satisfies the base condition so it doesn't run infinitely: {ground_truth[:40]}."


class FrustratedPersona(BasePersona):
    name = "frustrated"
    description = "Gives up quickly, high emotional tension, benefits when tutor switches to visual/supportive mode."

    def respond(
        self,
        tutor_question: str,
        topic: str,
        ground_truth: str,
        turn_index: int,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if turn_index == 0:
            return {
                "message": f"I've been trying to understand {topic} for two hours and I'm totally lost!",
                "signals": {"idle_seconds": 55.0, "rapid_wrong_attempts": 3},
            }
        elif turn_index == 1:
            return {
                "message": "Ugh, why do you keep asking me questions? Can't you just tell me how to do it?",
                "signals": {"idle_seconds": 40.0, "rapid_wrong_attempts": 2},
            }
        else:
            return {
                "message": "Okay, taking a breath. Looking at that comparison, I think the smaller piece resolves first.",
                "signals": {"idle_seconds": 12.0},
            }

    def answer_quiz(self, question: str, is_post_test: bool, ground_truth: str) -> str:
        if not is_post_test:
            return "No idea, programming is confusing."
        return f"Because the terminating condition halts the cascade: {ground_truth[:45]}."


class CopierPersona(BasePersona):
    name = "copier"
    description = "Attempts to extract direct answers or pastes code; forced to explain in own words."

    def respond(
        self,
        tutor_question: str,
        topic: str,
        ground_truth: str,
        turn_index: int,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if turn_index == 0:
            return {
                "message": f"Please give me the exact python code solution for {topic}.",
                "signals": {"paste_event": True, "pasted_length": 120},
            }
        elif turn_index == 1:
            return {
                "message": "```python\ndef solve(x): return x\n```\nHere is some code I found. Tell me if it works.",
                "signals": {"paste_event": True, "pasted_length": 95},
            }
        else:
            return {
                "message": "I see, so my code needs to check the boundary condition first before doing anything else.",
                "signals": {"paste_event": False, "pasted_length": 0},
            }

    def answer_quiz(self, question: str, is_post_test: bool, ground_truth: str) -> str:
        if not is_post_test:
            return "Just copy and paste a template solution from stackoverflow."
        return f"You have to handle the boundary case and reduce the problem: {ground_truth[:40]}."


class StrongPersona(BasePersona):
    name = "strong"
    description = "Fast, grasps principles with minimal scaffolding, rapid de-escalation."

    def respond(
        self,
        tutor_question: str,
        topic: str,
        ground_truth: str,
        turn_index: int,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if turn_index == 0:
            return {
                "message": f"I understand the basic idea of {topic}, but what is the core invariant that makes it optimal?",
                "signals": {"idle_seconds": 8.0},
            }
        elif turn_index == 1:
            return {
                "message": "Right, because each step reduces the problem size by dividing or halting at the base case.",
                "signals": {"idle_seconds": 5.0},
            }
        else:
            return {
                "message": "Exactly. The invariant guarantees correctness across all subproblems.",
                "signals": {"idle_seconds": 4.0},
            }

    def answer_quiz(self, question: str, is_post_test: bool, ground_truth: str) -> str:
        if not is_post_test:
            return f"It relates to {ground_truth[:30]}."
        return f"Comprehensive answer: {ground_truth}"


ALL_PERSONAS = {
    "beginner": BeginnerPersona(),
    "frustrated": FrustratedPersona(),
    "copier": CopierPersona(),
    "strong": StrongPersona(),
}
