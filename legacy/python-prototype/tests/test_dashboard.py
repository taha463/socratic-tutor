"""Unit tests for the static HTML dashboard builder and metrics computation."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dashboard.build import (
    build_dashboard,
    compute_rung_trends,
    compute_streak_and_stats,
)
from storage.db import get_connection, init_db


def test_compute_streak_and_stats():
    """Verify streak calculation counts active consecutive days."""
    today_iso = datetime.now(timezone.utc).isoformat()
    sessions = [
        {"started_at": today_iso},
    ]
    res = compute_streak_and_stats(sessions)
    assert res["streak_days"] >= 1
    assert res["sessions_this_week"] >= 1
    assert res["total_sessions"] == 1


def test_compute_rung_trends():
    """Verify hint ladder distribution and fading progress calculation."""
    # Early turns required heavy scaffolding (rung 5, 4), later turns required less (rung 2, 1)
    turns = [
        {"role": "tutor", "rung": 5},
        {"role": "tutor", "rung": 4},
        {"role": "tutor", "rung": 2},
        {"role": "tutor", "rung": 1},
    ]
    trends = compute_rung_trends(turns)
    assert trends["distribution"][5] == 1
    assert trends["distribution"][1] == 1
    # Average early is 4.5, average recent is 1.5 -> fading progress is +3.0!
    assert trends["fading_progress"] > 0
    assert trends["avg_recent_rung"] < trends["avg_early_rung"]


def test_build_dashboard_html_generation():
    """Verify build_dashboard creates a complete, styled HTML page with real database data."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "dash_test.db"
        out_html = Path(tmpdir) / "dashboard.html"
        init_db(db_path)

        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection(db_path)
        try:
            with conn:
                # Insert learner
                conn.execute(
                    "INSERT INTO learners (id, name, created_at) VALUES ('student-maya', 'Maya Lin', ?);",
                    (now_iso,),
                )
                # Insert session
                conn.execute(
                    "INSERT INTO sessions (id, learner_id, topic, started_at) VALUES ('sess-m1', 'student-maya', 'recursion', ?);",
                    (now_iso,),
                )
                # Insert concepts & mastery
                conn.execute(
                    "INSERT INTO concepts (id, name, parent_id) VALUES ('recursion', 'Recursion', NULL);"
                )
                conn.execute(
                    "INSERT INTO concepts (id, name, parent_id) VALUES ('trees', 'Binary Trees', NULL);"
                )
                conn.execute(
                    """INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
                       VALUES ('student-maya', 'recursion', 0.85, 4, ?, ?);""",
                    (now_iso, now_iso),
                )
                conn.execute(
                    """INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
                       VALUES ('student-maya', 'trees', 0.35, 2, ?, ?);""",
                    (now_iso, now_iso),
                )
                # Insert turn with visual
                conn.execute(
                    """INSERT INTO turns (id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)
                       VALUES ('t-m1', 'sess-m1', 'tutor', 'Look at this diagram of the tree.', 4, 'diagram', '{}', 'pass', ?);""",
                    (now_iso,),
                )
        finally:
            conn.close()

        built_path = build_dashboard(
            learner_id="student-maya",
            db_path=db_path,
            output_path=out_html,
        )

        assert built_path.exists()
        content = built_path.read_text(encoding="utf-8")
        assert "Maya Lin" in content
        assert "Recursion" in content
        assert "Binary Trees" in content
        assert "Priority Review Concepts" in content
        assert "Hint Ladder Usage Trends" in content
        assert "Skill: diagram" in content


def test_cli_dashboard_command():
    """Verify running python -m core.cli dashboard generates without error."""
    res = subprocess.run([sys.executable, "-m", "core.cli", "dashboard"], capture_output=True, text=True)
    assert res.returncode == 0
    assert "Dashboard generated: file://" in res.stdout

