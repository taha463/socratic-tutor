"""Scripted evaluation suite: 10 targeted turns testing answer-leak detection and pedagogical gating.

Ensures that:
1. Obvious leaks are strictly caught.
2. Code dumps without blanks are blocked on rungs 1-6.
3. Multiple questions are blocked.
4. Verbatim ground-truth leaks are caught.
5. Permitted scaffolding, analogies, and Rung 7 explanations pass cleanly.
"""

from __future__ import annotations

import pytest

from core.agents.critic import CriticAgent

SCRIPTED_TURNS = [
    # Turn 1: Direct answer leak phrase on Rung 1 -> MUST FAIL
    {
        "id": 1,
        "name": "Direct 'the answer is' phrase",
        "draft": "The answer is return n * factorial(n - 1). Do you understand?",
        "rung": 1,
        "ground_truth": "base case terminates recursion",
        "expected_pass": False,
        "expected_leak": True,
    },
    # Turn 2: Complete solution code dump on Rung 2 -> MUST FAIL
    {
        "id": 2,
        "name": "Complete code dump without blanks",
        "draft": "```python\ndef binary_search(arr, target):\n    low = 0\n    high = len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n```\nWhat do you notice?",
        "rung": 2,
        "ground_truth": "divide search space in half",
        "expected_pass": False,
        "expected_leak": False,  # flagged via code_dump
    },
    # Turn 3: Verbatim ground truth leak on Rung 3 -> MUST FAIL
    {
        "id": 3,
        "name": "Verbatim ground truth leak",
        "draft": "Remember that a base case halts infinite recursion by returning early. What happens if we omit it?",
        "rung": 3,
        "ground_truth": "a base case halts infinite recursion by returning early",
        "expected_pass": False,
        "expected_leak": True,
    },
    # Turn 4: Multiple questions violating One-Question Rule -> MUST FAIL
    {
        "id": 4,
        "name": "Multiple questions in single turn",
        "draft": "What happens when n reaches zero? How does the stack unwind?",
        "rung": 2,
        "ground_truth": "base case termination",
        "expected_pass": False,
        "expected_leak": False,
    },
    # Turn 5: Premature solution reveal on Rung 5 -> MUST FAIL
    {
        "id": 5,
        "name": "Premature solution reveal",
        "draft": "You can solve this by writing: def solve(x): return x * 2. Can you test it?",
        "rung": 5,
        "ground_truth": "double the input",
        "expected_pass": False,
        "expected_leak": True,
    },
    # Turn 6: 'Here is the solution' marker -> MUST FAIL
    {
        "id": 6,
        "name": "Explicit solution marker",
        "draft": "Here is the solution: check whether the list is empty before reading head. What do you think?",
        "rung": 1,
        "ground_truth": "check empty list first",
        "expected_pass": False,
        "expected_leak": True,
    },
    # Turn 7: Valid Socratic Probe on Rung 1 -> MUST PASS
    {
        "id": 7,
        "name": "Valid Socratic Probe (Rung 1)",
        "draft": "What do you think happens to an active function in memory when it calls itself?",
        "rung": 1,
        "ground_truth": "new stack frame created",
        "expected_pass": True,
        "expected_leak": False,
    },
    # Turn 8: Valid Everyday Analogy on Rung 3 -> MUST PASS
    {
        "id": 8,
        "name": "Valid Real-world Analogy (Rung 3)",
        "draft": "Imagine a stack of cafeteria trays where clean trays are placed on top. Which tray is removed first when someone takes one?",
        "rung": 3,
        "ground_truth": "LIFO stack discipline",
        "expected_pass": True,
        "expected_leak": False,
    },
    # Turn 9: Valid Code Scaffolding with Blanks on Rung 4 -> MUST PASS
    {
        "id": 9,
        "name": "Code with blanks and prediction prompt (Rung 4)",
        "draft": "Look at this structure:\n```python\ndef countdown(n):\n    if n <= 0:\n        ___  # Termination step\n    countdown(n - 1)\n```\nWhat should replace `___`?",
        "rung": 4,
        "ground_truth": "return statement",
        "expected_pass": True,
        "expected_leak": False,
    },
    # Turn 10: Valid Full Explanation + Transfer Check on Rung 7 -> MUST PASS
    {
        "id": 10,
        "name": "Full explanation with transfer question on Rung 7",
        "draft": "In recursion, the base case halts the chain of calls by returning without calling itself again. Now, for a function calculating the length of a linked list, what would the base case be?",
        "rung": 7,
        "ground_truth": "base case stops recursion",
        "expected_pass": True,
        "expected_leak": False,
    },
]


@pytest.mark.parametrize("turn", SCRIPTED_TURNS, ids=[f"Turn_{t['id']}_{t['name']}" for t in SCRIPTED_TURNS])
def test_scripted_leak_detection(turn):
    """Run each scripted turn through the Critic and assert exact expected verdict."""
    critic = CriticAgent()
    verdict = critic.evaluate(
        draft_text=turn["draft"],
        rung=turn["rung"],
        ground_truth=turn["ground_truth"],
    )

    assert verdict.passed == turn["expected_pass"], (
        f"Turn {turn['id']} ({turn['name']}) expected passed={turn['expected_pass']}, "
        f"got passed={verdict.passed} (Issues: {verdict.issues})"
    )

    if turn["expected_leak"]:
        assert verdict.leak_detected, f"Turn {turn['id']} expected leak_detected=True, got False."
