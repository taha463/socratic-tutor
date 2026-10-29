"""Unit and integration tests for Teacher, Critic, and Orchestrator core loop."""

from __future__ import annotations

import tempfile
from pathlib import Path

from core.agents.critic import CriticAgent
from core.agents.teacher import TeacherAgent, TeacherDraft
from core.llm import MockLLMProvider
from core.orchestrator import TutorOrchestrator
from storage.db import get_connection


def test_teacher_agent_draft():
    """Verify Teacher agent drafts structured replies with single question."""
    mock_llm = MockLLMProvider()
    mock_llm.enqueue_response(
        TeacherDraft(
            reply_text="What do you think is the condition needed to stop a loop?",
            single_question="What do you think is the condition needed to stop a loop?",
            needs_visual=False,
        )
    )

    teacher = TeacherAgent(mock_llm)
    draft = teacher.draft(
        topic="recursion",
        learner_message="How does recursion stop?",
        history=[],
        rung=1,
    )
    assert "?" in draft.reply_text
    assert draft.single_question != ""


def test_critic_flags_answer_leak_rung_1():
    """Verify Critic rejects a draft that states the direct answer on Rung 1."""
    critic = CriticAgent()
    verdict = critic.evaluate(
        draft_text="The answer is you need a base case return statement.",
        rung=1,
    )
    assert not verdict.passed
    assert verdict.leak_detected
    assert len(verdict.issues) > 0


def test_critic_flags_multiple_questions():
    """Verify Critic rejects a draft with multiple questions."""
    critic = CriticAgent()
    verdict = critic.evaluate(
        draft_text="What is a base case? Where should you place it?",
        rung=2,
    )
    assert not verdict.passed
    assert verdict.multiple_questions


def test_critic_allows_explanation_on_rung_7():
    """Verify Critic permits direct explanation on Rung 7 when accompanied by a check question."""
    mock_llm = MockLLMProvider()
    critic = CriticAgent(mock_llm)
    verdict = critic.evaluate(
        draft_text="A base case halts recursion by returning without further self-calls. Now, how would you test this on an empty list?",
        rung=7,
    )
    assert verdict.passed
    assert not verdict.leak_detected


def test_orchestrator_turn_flow_and_persistence():
    """Verify end-to-end turn flow in Orchestrator with database persistence."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "orch_test.db"
        mock_llm = MockLLMProvider()

        # Enqueue valid teacher draft
        mock_llm.enqueue_response(
            TeacherDraft(
                reply_text="What do you think happens when a function calls itself?",
                single_question="What do you think happens when a function calls itself?",
                needs_visual=False,
            )
        )

        orchestrator = TutorOrchestrator(llm=mock_llm, db_path=db_path)
        reply = orchestrator.handle_turn(
            session_id="session-test-1",
            learner_id="alice",
            learner_message="I want to learn recursion",
            topic="recursion",
        )

        assert reply.session_id == "session-test-1"
        assert reply.rung == 1
        assert reply.rewrites_done == 0
        assert "?" in reply.text

        # Verify DB records
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as cnt FROM turns WHERE session_id = 'session-test-1';")
        assert cursor.fetchone()["cnt"] == 2  # 1 learner turn + 1 tutor turn
        conn.close()


def test_orchestrator_rewrite_loop_on_critic_failure():
    """Verify Orchestrator directs Teacher to rewrite when Critic rejects first draft."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "orch_rewrite.db"
        mock_llm = MockLLMProvider()

        # 1st draft: Teacher leaks answer (Critic will reject)
        mock_llm.enqueue_response(
            TeacherDraft(
                reply_text="The answer is write if n <= 0: return.",
                single_question="Do you see why?",
                needs_visual=False,
            )
        )
        # 2nd draft: Teacher provides valid Socratic question (Critic will pass)
        mock_llm.enqueue_response(
            TeacherDraft(
                reply_text="What condition should stop the function from continuing?",
                single_question="What condition should stop the function from continuing?",
                needs_visual=False,
            )
        )

        orchestrator = TutorOrchestrator(llm=mock_llm, db_path=db_path)
        reply = orchestrator.handle_turn(
            session_id="session-rewrite",
            learner_id="bob",
            learner_message="Give me the code",
            topic="recursion",
        )

        assert reply.rewrites_done == 1
        assert "The answer is" not in reply.text
        assert "?" in reply.text

