"""Central Orchestrator coordinating Socratic agents, hint ladder, and storage."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from core.agents.critic import CriticAgent, CriticVerdict
from core.agents.diagnostician import DiagnosticianAgent
from core.agents.teacher import TeacherAgent, TeacherDraft
from core.agents.visualizer import VisualizerAgent
from core.ladder import HintLadder
from core.learner import LearnerStore
from core.llm import BaseLLMProvider, get_llm_client
from storage.db import get_connection, init_db

logger = logging.getLogger(__name__)


class TutorReply(BaseModel):
    """Normalized response payload delivered to adapters."""

    text: str = Field(..., description="The final approved teacher message.")
    session_id: str
    learner_id: str
    rung: int
    critic_verdict: Optional[CriticVerdict] = None
    visual_path: Optional[str] = None
    visual_html: Optional[str] = None
    rewrites_done: int = 0
    learner_state: str = "LEARNING"
    frustration: float = 0.0


class TutorOrchestrator:
    """Executes the Socratic multi-agent feedback loop on every learner turn."""

    def __init__(
        self,
        llm: Optional[BaseLLMProvider] = None,
        db_path: Optional[str | Path] = None,
        teacher: Optional[TeacherAgent] = None,
        critic: Optional[CriticAgent] = None,
        diagnostician: Optional[DiagnosticianAgent] = None,
        visualizer: Optional[VisualizerAgent] = None,
        learner_store: Optional[LearnerStore] = None,
    ) -> None:
        self.db_path = db_path
        init_db(self.db_path)
        self.llm = llm or get_llm_client()
        self.teacher = teacher or TeacherAgent(self.llm)
        self.critic = critic or CriticAgent(self.llm)
        self.diagnostician = diagnostician or DiagnosticianAgent(self.llm)
        self.visualizer = visualizer or VisualizerAgent(self.llm)
        self.learner_store = learner_store or LearnerStore(self.db_path)

    def handle_turn(
        self,
        session_id: str,
        learner_id: str,
        learner_message: str,
        topic: str = "general",
        signals: Optional[Dict[str, Any]] = None,
        ground_truth: Optional[str] = None,
    ) -> TutorReply:
        """Process a learner turn through the multi-agent pipeline."""
        now_iso = datetime.now(timezone.utc).isoformat()
        signals = signals or {}
        conn = get_connection(self.db_path)

        try:
            # 1. Ensure learner and session records exist
            with conn:
                conn.execute(
                    "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES (?, ?, ?);",
                    (learner_id, learner_id, now_iso),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO sessions (id, learner_id, topic, started_at) VALUES (?, ?, ?, ?);",
                    (session_id, learner_id, topic, now_iso),
                )

            # Record telemetry signals in DB
            for sig_k, sig_v in signals.items():
                if isinstance(sig_v, (int, float)):
                    self.learner_store.record_signal(session_id, sig_k, float(sig_v))

            # 2. Record incoming learner turn
            turn_id_learner = str(uuid.uuid4())
            signals_json = json.dumps(signals)
            with conn:
                conn.execute(
                    """INSERT INTO turns (id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)
                       VALUES (?, ?, 'learner', ?, NULL, NULL, ?, NULL, ?);""",
                    (turn_id_learner, session_id, learner_message, signals_json, now_iso),
                )

            # 3. Retrieve conversation history
            cursor = conn.cursor()
            cursor.execute(
                "SELECT role, text, rung FROM turns WHERE session_id = ? ORDER BY ts ASC;",
                (session_id,),
            )
            raw_turns = cursor.fetchall()
            history: List[Dict[str, str]] = [
                {"role": row["role"], "content": row["text"]} for row in raw_turns[:-1]
            ]

            # Determine current active rung and state
            last_tutor_rung = 1
            for row in reversed(raw_turns[:-1]):
                if row["role"] == "tutor" and row["rung"]:
                    last_tutor_rung = int(row["rung"])
                    break

            ladder = HintLadder(current_rung=last_tutor_rung)

            # 4. Diagnostician assessment
            prior_mastery = self.learner_store.get_mastery(learner_id, topic)
            diag = self.diagnostician.diagnose(
                session_id=session_id,
                learner_message=learner_message,
                signals=signals,
                history=history,
                mastery_score=prior_mastery,
                prior_turns_count=len(history),
            )
            learner_state = diag.state
            frustration = diag.frustration
            rec_rung = diag.recommended_rung

            # Update ladder
            is_success = learner_state == "MASTERY" or "got it" in learner_message.lower() or "i understand" in learner_message.lower()
            active_rung = ladder.update(
                is_success=is_success,
                frustration=frustration,
                recommended_rung=rec_rung,
            )

            # Update Bayesian knowledge tracing mastery
            if is_success:
                self.learner_store.update_mastery(learner_id, topic, is_success=True)
            elif learner_state == "STUCK":
                self.learner_store.update_mastery(learner_id, topic, is_success=False)
                self.learner_store.record_mistake(learner_id, topic, "stuck_or_confused")

            # 5. Teacher-Critic iterative drafting loop (max 2 rewrites)
            max_rewrites = 2
            rewrite_count = 0
            rewrite_instructions: Optional[str] = None
            final_draft: Optional[TeacherDraft] = None
            final_verdict: Optional[CriticVerdict] = None

            while rewrite_count <= max_rewrites:
                # Teacher drafts reply
                draft = self.teacher.draft(
                    topic=topic,
                    learner_message=learner_message,
                    history=history,
                    rung=active_rung,
                    frustration=frustration,
                    learner_state=learner_state,
                    behavioral_signals=signals,
                    rewrite_instructions=rewrite_instructions,
                    ground_truth=ground_truth,
                )
                final_draft = draft

                # Critic evaluates draft
                verdict = self.critic.evaluate(
                    draft_text=draft.reply_text,
                    rung=active_rung,
                    ground_truth=ground_truth,
                )
                final_verdict = verdict

                if verdict.passed or rewrite_count == max_rewrites:
                    break

                # Need rewrite
                rewrite_count += 1
                rewrite_instructions = verdict.rewrite_instructions or "; ".join(verdict.issues)

            # 6. Visualizer integration (if needed)
            visual_path = None
            visual_html = None
            skill_used = None
            if self.visualizer and final_draft and (final_draft.needs_visual or active_rung == 4):
                try:
                    vis_result = self.visualizer.render(
                        concept=final_draft.visual_concept or topic,
                        skill_type=final_draft.visual_type,
                        rung=active_rung,
                    )
                    visual_path = vis_result.get("file_path")
                    visual_html = vis_result.get("html")
                    skill_used = vis_result.get("skill")
                except Exception as e:
                    logger.warning("Visualizer generation error: %s", e)

            # 7. Record tutor response in DB
            turn_id_tutor = str(uuid.uuid4())
            tutor_ts = datetime.now(timezone.utc).isoformat()
            with conn:
                conn.execute(
                    """INSERT INTO turns (id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)
                       VALUES (?, ?, 'tutor', ?, ?, ?, ?, ?, ?);""",
                    (
                        turn_id_tutor,
                        session_id,
                        final_draft.reply_text,
                        active_rung,
                        skill_used,
                        signals_json,
                        final_verdict.model_dump_json() if final_verdict else None,
                        tutor_ts,
                    ),
                )
        finally:
            conn.close()

        return TutorReply(
            text=final_draft.reply_text,
            session_id=session_id,
            learner_id=learner_id,
            rung=active_rung,
            critic_verdict=final_verdict,
            visual_path=visual_path,
            visual_html=visual_html,
            rewrites_done=rewrite_count,
            learner_state=learner_state,
            frustration=frustration,
        )
