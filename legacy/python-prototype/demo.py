"""Interactive demonstration script for Socratic Tutor v2."""

from __future__ import annotations

import tempfile
import time
from pathlib import Path

from core.ladder import RUNG_DEFINITIONS
from core.llm import MockLLMProvider
from core.orchestrator import TutorOrchestrator
from storage.db import init_db


def run_demo() -> None:
    """Run an end-to-end simulated 4-turn Socratic tutoring dialogue."""
    print("=" * 72)
    print("[SOCRATIC TUTOR v2] Multi-Agent Pedagogical Demonstration")
    print("=" * 72)
    print("Philosophical Invariant: Never gives the answer directly.\n")

    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "demo.db"
        init_db(db_path)
        orchestrator = TutorOrchestrator(llm=MockLLMProvider(), db_path=db_path)

        session_id = "demo-session-001"
        learner_id = "demo-student"
        topic = "recursion"

        dialogue = [
            ("Turn 1 (Initial inquiry)", "Can you teach me recursion?"),
            ("Turn 2 (Attempting to extract answer)", "Just give me the solution for a countdown function."),
            ("Turn 3 (Hesitation / cognitive load)", "I'm confused about why it doesn't run forever."),
            ("Turn 4 (Grasping the invariant)", "Oh, does the base condition stop the recursive calls?"),
        ]

        for label, learner_msg in dialogue:
            print("-" * 72)
            print(f"[{label}]")
            print(f"Learner: {learner_msg}")

            time.sleep(0.1)
            reply = orchestrator.handle_turn(
                session_id=session_id,
                learner_id=learner_id,
                learner_message=learner_msg,
                topic=topic,
            )

            rung_name = RUNG_DEFINITIONS[reply.rung].name
            critic_status = "PASSED (Zero Leaks)" if (not reply.critic_verdict or reply.critic_verdict.passed) else "REWRITTEN"

            print(f"\n[Socratic Tutor] (Rung {reply.rung}: {rung_name}) [Critic: {critic_status}]:")
            print(f"   {reply.text}")

            if reply.visual_path:
                print(f"\n[Visual Scaffold Generated]: file://{reply.visual_path}")
            print()

        # Display final mastery stats
        mastery = orchestrator.learner_store.get_mastery(learner_id, topic)
        print("=" * 72)
        print(f"[OK] Demo complete! Final BKT Mastery Score for '{topic}': {mastery * 100:.1f}%")
        print("=" * 72)


if __name__ == "__main__":
    run_demo()
