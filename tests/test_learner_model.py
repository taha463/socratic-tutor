"""Unit and integration tests for LearnerStore, BKT mastery updates, and memory decay."""

from __future__ import annotations

import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from core.learner import LearnerStore
from core.orchestrator import TutorOrchestrator
from storage.db import get_connection


@pytest.fixture
def temp_store():
    """Create a temporary learner store for test isolation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_learner.db"
        store = LearnerStore(db_path)
        yield store, db_path


def test_bkt_mastery_progression(temp_store):
    """Verify Bayesian Knowledge Tracing increases on success and decreases on failure."""
    store, _ = temp_store
    learner_id = "student-charlie"
    concept_id = "recursion-base-case"

    # Initial score should default to 0.1
    initial = store.get_mastery(learner_id, concept_id)
    assert initial == pytest.approx(0.1)

    # 1. Success 1
    s1 = store.update_mastery(learner_id, concept_id, is_success=True)
    # Expected: 0.1 + 0.25 * (1.0 - 0.1) = 0.325
    assert s1 == pytest.approx(0.325, abs=0.01)
    assert s1 > initial

    # 2. Success 2
    s2 = store.update_mastery(learner_id, concept_id, is_success=True)
    assert s2 > s1

    # 3. Failure (slip)
    s3 = store.update_mastery(learner_id, concept_id, is_success=False)
    assert s3 < s2
    assert s3 >= 0.05


def test_decayed_score_and_weak_concepts(temp_store):
    """Verify Ebbinghaus forgetting curve decays mastery over elapsed days."""
    store, _ = temp_store
    learner_id = "student-diana"

    # Concept A: recent mastery (high)
    store.update_mastery(learner_id, "pointers", is_success=True)
    store.update_mastery(learner_id, "pointers", is_success=True)
    store.update_mastery(learner_id, "pointers", is_success=True)

    # Concept B: old mastery from 21 days ago
    old_iso = (datetime.now(timezone.utc) - timedelta(days=21)).isoformat()
    conn = get_connection(store.db_path)
    try:
        with conn:
            conn.execute(
                "INSERT INTO concepts (id, name, parent_id) VALUES ('heaps', 'Min-Heaps', NULL);"
            )
            conn.execute(
                """INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
                   VALUES (?, ?, 0.8, 5, ?, ?);""",
                (learner_id, "heaps", old_iso, old_iso),
            )
    finally:
        conn.close()

    weak = store.get_weak_concepts(learner_id, threshold=0.6)
    weak_ids = [w["concept_id"] for w in weak]
    assert "heaps" in weak_ids
    # Heaps decayed from 0.8 * 0.5^3 = 0.10
    heaps_stat = next(w for w in weak if w["concept_id"] == "heaps")
    assert heaps_stat["score"] < 0.2


def test_signals_and_mistakes_tracking(temp_store):
    """Verify signals and mistake patterns are recorded."""
    store, db_path = temp_store
    session_id = "sess-signals"
    learner_id = "student-eva"

    store.get_or_create_learner(learner_id, "Eva")
    store.record_signal(session_id, "idle_seconds", 32.5)
    store.record_signal(session_id, "paste_event", 1.0)

    store.record_mistake(learner_id, "sql-joins", "confused inner vs left join")
    store.record_mistake(learner_id, "sql-joins", "confused inner vs left join")

    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) as cnt FROM signals WHERE session_id = ?;", (session_id,))
    assert cursor.fetchone()["cnt"] == 2

    cursor.execute("SELECT count FROM mistakes WHERE learner_id = ? AND concept_id = 'sql-joins';", (learner_id,))
    assert cursor.fetchone()["count"] == 2
    conn.close()


def test_orchestrator_diagnostician_learner_integration():
    """Verify end-to-end integration: Orchestrator invokes Diagnostician and updates learner mastery."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "diag_orch.db"
        orchestrator = TutorOrchestrator(db_path=db_path)

        # Turn 1: Learner says they understand -> should mark success & update mastery
        reply = orchestrator.handle_turn(
            session_id="diag-sess-1",
            learner_id="student-frank",
            learner_message="Oh I got it! The base case stops the loop.",
            topic="recursion",
        )
        assert reply.rung >= 1

        store = LearnerStore(db_path)
        mastery = store.get_mastery("student-frank", "recursion")
        assert mastery > 0.1  # Mastery increased from initial 0.1
