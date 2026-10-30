"""Unit and integration tests for the Visualizer Agent."""

from __future__ import annotations

import tempfile
from pathlib import Path

from core.agents.teacher import TeacherDraft
from core.agents.visualizer import VisualizerAgent
from core.llm import MockLLMProvider
from core.orchestrator import TutorOrchestrator
from skills.registry import SkillRegistry


def test_visualizer_agent_decide_from_curriculum():
    """Verify VisualizerAgent uses pre-tested curriculum diagrams and analogies when available."""
    mock_llm = MockLLMProvider()
    vis = VisualizerAgent(llm=mock_llm)

    # 1. Diagram decision for recursion
    dec_diag = vis.decide(concept="recursion", skill_type="diagram", rung=4)
    assert dec_diag.chosen_skill == "diagram"
    assert "?BLANK_BASE_CASE?" in dec_diag.visual_spec["mermaid_source"]

    # 2. Analogy decision for binary search
    dec_an = vis.decide(concept="binary_search", skill_type="analogy", rung=3)
    assert dec_an.chosen_skill == "analogy"
    assert "dictionary" in dec_an.visual_spec["analogy"].lower()


def test_visualizer_agent_render():
    """Verify VisualizerAgent renders artifact to file with blanks preserved."""
    with tempfile.TemporaryDirectory() as tmpdir:
        vis_dir = Path(tmpdir) / "visuals"
        registry = SkillRegistry(visuals_dir=vis_dir)
        mock_llm = MockLLMProvider()
        vis = VisualizerAgent(llm=mock_llm, registry=registry)

        rendered = vis.render(concept="recursion", skill_type="diagram", rung=4)
        assert rendered["skill"] == "diagram"
        assert rendered["file_path"] is not None
        assert Path(rendered["file_path"]).exists()
        assert rendered["has_blanks"]


def test_orchestrator_visual_request_end_to_end():
    """Verify Orchestrator automatically invokes Visualizer when Teacher requests a visual."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "orch_vis.db"
        vis_dir = Path(tmpdir) / "visuals"
        mock_llm = MockLLMProvider()

        # Teacher explicitly asks for visual
        mock_llm.enqueue_response(
            TeacherDraft(
                reply_text="Let us examine the call chain visually. What base case halts this sequence?",
                single_question="What base case halts this sequence?",
                needs_visual=True,
                visual_concept="recursion",
                visual_type="diagram",
            )
        )

        registry = SkillRegistry(visuals_dir=vis_dir)
        visualizer = VisualizerAgent(llm=mock_llm, registry=registry)

        orchestrator = TutorOrchestrator(
            llm=mock_llm,
            db_path=db_path,
            visualizer=visualizer,
        )

        reply = orchestrator.handle_turn(
            session_id="vis-sess-1",
            learner_id="student-grace",
            learner_message="Can you show me a picture of recursion?",
            topic="recursion",
        )

        assert reply.visual_path is not None
        assert Path(reply.visual_path).exists()
        assert reply.visual_html is not None
        assert "mermaid" in reply.visual_html.lower()

