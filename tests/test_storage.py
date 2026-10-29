"""Unit and integration tests for storage and database operations."""

from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

import pytest

from storage.db import get_connection, init_db


@pytest.fixture
def temp_db():
    """Create a temporary database for test isolation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_socratic.db"
        init_db(db_path)
        yield db_path


def test_db_initialization(temp_db):
    """Verify that tables and indices are properly created."""
    conn = get_connection(temp_db)
    cursor = conn.cursor()

    # Query sqlite_master for table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row["name"] for row in cursor.fetchall()}

    required_tables = {
        "learners",
        "sessions",
        "turns",
        "concepts",
        "mastery",
        "mistakes",
        "signals",
    }
    assert required_tables.issubset(tables), f"Missing tables: {required_tables - tables}"
    conn.close()


def test_foreign_keys_enforced(temp_db):
    """Verify that SQLite enforces foreign key constraints."""
    conn = get_connection(temp_db)
    cursor = conn.cursor()

    # Attempt to insert a session with a non-existent learner_id
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute(
            "INSERT INTO sessions (id, learner_id, topic, started_at) VALUES ('s1', 'nonexistent', 'recursion', '2026-10-30T00:00:00Z');"
        )
        conn.commit()
    conn.close()


def test_crud_lifecycle(temp_db):
    """Verify CRUD lifecycle across all schema entities."""
    conn = get_connection(temp_db)
    cursor = conn.cursor()

    # 1. Insert learner
    cursor.execute(
        "INSERT INTO learners (id, name, created_at) VALUES (?, ?, ?);",
        ("learner-1", "Alice", "2026-10-30T00:00:00Z"),
    )

    # 2. Insert session
    cursor.execute(
        "INSERT INTO sessions (id, learner_id, topic, started_at) VALUES (?, ?, ?, ?);",
        ("sess-1", "learner-1", "recursion", "2026-10-30T00:01:00Z"),
    )

    # 3. Insert turn
    cursor.execute(
        """INSERT INTO turns (id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        ("turn-1", "sess-1", "learner", "What is recursion?", 1, None, "{}", "pass", "2026-10-30T00:01:05Z"),
    )

    # 4. Insert concept & mastery
    cursor.execute(
        "INSERT INTO concepts (id, name, parent_id) VALUES (?, ?, ?);",
        ("rec-base", "Base Case", None),
    )
    cursor.execute(
        """INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
           VALUES (?, ?, ?, ?, ?, ?);""",
        ("learner-1", "rec-base", 0.75, 3, "2026-10-30T00:01:10Z", "2026-10-30T00:01:10Z"),
    )

    # 5. Insert mistakes
    cursor.execute(
        """INSERT INTO mistakes (learner_id, concept_id, pattern, count, last_seen)
           VALUES (?, ?, ?, ?, ?);""",
        ("learner-1", "rec-base", "omitted base case", 2, "2026-10-30T00:01:15Z"),
    )

    # 6. Insert signals
    cursor.execute(
        "INSERT INTO signals (session_id, ts, type, value) VALUES (?, ?, ?, ?);",
        ("sess-1", "2026-10-30T00:01:20Z", "idle_seconds", 12.5),
    )
    conn.commit()

    # Query back and verify integrity
    cursor.execute("SELECT name FROM learners WHERE id = 'learner-1';")
    assert cursor.fetchone()["name"] == "Alice"

    cursor.execute("SELECT count(*) as cnt FROM turns WHERE session_id = 'sess-1';")
    assert cursor.fetchone()["cnt"] == 1

    cursor.execute("SELECT score FROM mastery WHERE learner_id = 'learner-1' AND concept_id = 'rec-base';")
    assert cursor.fetchone()["score"] == pytest.approx(0.75)

    conn.close()
