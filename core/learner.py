"""Learner modeling and Bayesian knowledge tracing with SQLite persistence."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from storage.db import get_connection, init_db


class LearnerStore:
    """Manages learner profiles, knowledge tracing mastery, mistakes, and telemetry signals."""

    def __init__(self, db_path: Optional[str | Path] = None) -> None:
        self.db_path = db_path
        init_db(self.db_path)

    def get_or_create_learner(self, learner_id: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Ensure learner exists in DB and return their record."""
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection(self.db_path)
        try:
            with conn:
                conn.execute(
                    "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES (?, ?, ?);",
                    (learner_id, name or learner_id, now_iso),
                )
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, created_at FROM learners WHERE id = ?;", (learner_id,))
            row = cursor.fetchone()
            return dict(row) if row else {"id": learner_id, "name": name or learner_id, "created_at": now_iso}
        finally:
            conn.close()

    def record_signal(self, session_id: str, signal_type: str, value: float) -> None:
        """Store a behavioral telemetry signal."""
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection(self.db_path)
        try:
            with conn:
                # Ensure dummy learner and session exist if not already present
                conn.execute(
                    "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES ('system', 'system', ?);",
                    (now_iso,),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO sessions (id, learner_id, topic, started_at) VALUES (?, 'system', 'telemetry', ?);",
                    (session_id, now_iso),
                )
                conn.execute(
                    "INSERT INTO signals (session_id, ts, type, value) VALUES (?, ?, ?, ?);",
                    (session_id, now_iso, signal_type, float(value)),
                )
        finally:
            conn.close()

    def record_mistake(self, learner_id: str, concept_id: str, pattern: str) -> None:
        """Record or increment a learner's conceptual mistake pattern."""
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection(self.db_path)
        try:
            with conn:
                conn.execute(
                    "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES (?, ?, ?);",
                    (learner_id, learner_id, now_iso),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO concepts (id, name, parent_id) VALUES (?, ?, NULL);",
                    (concept_id, concept_id),
                )
                conn.execute(
                    """INSERT INTO mistakes (learner_id, concept_id, pattern, count, last_seen)
                       VALUES (?, ?, ?, 1, ?)
                       ON CONFLICT(learner_id, concept_id, pattern) DO UPDATE SET
                       count = count + 1,
                       last_seen = excluded.last_seen;""",
                    (learner_id, concept_id, pattern, now_iso),
                )
        finally:
            conn.close()

    def get_mastery(self, learner_id: str, concept_id: str) -> float:
        """Retrieve raw mastery score for a concept (defaults to 0.1 for unvisited)."""
        conn = get_connection(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT score FROM mastery WHERE learner_id = ? AND concept_id = ?;",
                (learner_id, concept_id),
            )
            row = cursor.fetchone()
            return float(row["score"]) if row else 0.1
        finally:
            conn.close()

    def update_mastery(
        self,
        learner_id: str,
        concept_id: str,
        is_success: bool,
        concept_name: Optional[str] = None,
    ) -> float:
        """Update concept mastery using Bayesian Knowledge Tracing (BKT).

        Formulas:
        - On success:  score_new = score + 0.25 * (1.0 - score)
        - On failure:  score_new = max(0.05, score - 0.15 * score)
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection(self.db_path)
        try:
            # Ensure learner and concept exist
            with conn:
                conn.execute(
                    "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES (?, ?, ?);",
                    (learner_id, learner_id, now_iso),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO concepts (id, name, parent_id) VALUES (?, ?, NULL);",
                    (concept_id, concept_name or concept_id),
                )

            current_score = self.get_mastery(learner_id, concept_id)
            if is_success:
                new_score = current_score + 0.25 * (1.0 - current_score)
            else:
                new_score = max(0.05, current_score - 0.15 * current_score)

            new_score = max(0.0, min(1.0, round(new_score, 4)))

            with conn:
                conn.execute(
                    """INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
                       VALUES (?, ?, ?, 1, ?, ?)
                       ON CONFLICT(learner_id, concept_id) DO UPDATE SET
                       score = excluded.score,
                       attempts = attempts + 1,
                       last_seen = excluded.last_seen,
                       updated_at = excluded.updated_at;""",
                    (learner_id, concept_id, new_score, now_iso, now_iso),
                )
            return new_score
        finally:
            conn.close()

    def get_decayed_score(self, raw_score: float, last_seen_iso: str, half_life_days: float = 7.0) -> float:
        """Calculate memory-decayed score based on Ebbinghaus forgetting curve.

        score(t) = score * 0.5^(days_elapsed / half_life_days)
        """
        try:
            last_dt = datetime.fromisoformat(last_seen_iso)
            now_dt = datetime.now(timezone.utc)
            # Ensure timezone-aware comparison
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            delta_days = max(0.0, (now_dt - last_dt).total_seconds() / 86400.0)
            decay_factor = math.pow(0.5, delta_days / half_life_days)
            return round(raw_score * decay_factor, 4)
        except Exception:
            return raw_score

    def get_weak_concepts(self, learner_id: str, threshold: float = 0.6) -> List[Dict[str, Any]]:
        """Identify concepts requiring spaced practice due to low mastery or temporal decay."""
        conn = get_connection(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT m.concept_id, c.name, m.score, m.attempts, m.last_seen
                   FROM mastery m
                   LEFT JOIN concepts c ON m.concept_id = c.id
                   WHERE m.learner_id = ?;""",
                (learner_id,),
            )
            rows = cursor.fetchall()
            weak = []
            for r in rows:
                decayed = self.get_decayed_score(float(r["score"]), r["last_seen"])
                if decayed < threshold:
                    weak.append({
                        "concept_id": r["concept_id"],
                        "name": r["name"] or r["concept_id"],
                        "raw_score": float(r["score"]),
                        "score": decayed,
                        "attempts": r["attempts"],
                        "last_seen": r["last_seen"],
                    })
            weak.sort(key=lambda x: x["score"])
            return weak
        finally:
            conn.close()

    def get_all_mastery(self, learner_id: str) -> List[Dict[str, Any]]:
        """Retrieve all concept mastery records for a learner."""
        conn = get_connection(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT m.concept_id, c.name, m.score, m.attempts, m.last_seen, m.updated_at
                   FROM mastery m
                   LEFT JOIN concepts c ON m.concept_id = c.id
                   WHERE m.learner_id = ?
                   ORDER BY m.score DESC;""",
                (learner_id,),
            )
            rows = cursor.fetchall()
            result = []
            for r in rows:
                decayed = self.get_decayed_score(float(r["score"]), r["last_seen"])
                result.append({
                    "concept_id": r["concept_id"],
                    "name": r["name"] or r["concept_id"],
                    "score": decayed,
                    "raw_score": float(r["score"]),
                    "attempts": r["attempts"],
                    "last_seen": r["last_seen"],
                    "updated_at": r["updated_at"],
                })
            return result
        finally:
            conn.close()
