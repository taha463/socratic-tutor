"""Unit tests for the pedagogical skills (ELI5, Diagram, Analogy) and registry."""

from __future__ import annotations

import tempfile
from pathlib import Path

from skills.analogy.render import AnalogySkill
from skills.diagram.render import DiagramSkill
from skills.eli5.render import Eli5Skill
from skills.registry import SkillRegistry


def test_eli5_skill_render():
    """Verify ELI5 skill outputs clean HTML with analogy and mapping challenge."""
    skill = Eli5Skill()
    out = skill.render({
        "concept": "stack",
        "analogy": "A stack of pancakes on a plate.",
        "mapping_question": "Which pancake can you eat first without toppling the stack?",
    })

    assert out.skill == "eli5"
    assert out.has_blanks
    assert "pancakes" in out.html
    assert "Mapping Challenge" in out.html


def test_diagram_skill_render_with_blanks():
    """Verify Diagram skill preserves Mermaid blank nodes and injects prediction prompt."""
    skill = DiagramSkill()
    out = skill.render({
        "concept": "binary-search",
        "mermaid_source": "graph TD\n    A[Root] --> B[?BLANK?]",
        "prompt": "What goes in ?BLANK?",
        "blanks": ["?BLANK?"],
    })

    assert out.skill == "diagram"
    assert out.has_blanks
    assert "?BLANK?" in out.html
    assert "Prediction Prompt" in out.html
    assert "mermaid.initialize" in out.html


def test_analogy_skill_curriculum_lookup():
    """Verify Analogy skill resolves pre-curated analogies from curriculum store."""
    skill = AnalogySkill()
    out = skill.render({"concept": "recursion"})

    assert out.skill == "analogy"
    assert "doll" in out.html.lower() or "nesting" in out.html.lower()
    assert "Transfer Question" in out.html


def test_skill_registry_file_persistence():
    """Verify SkillRegistry writes visual HTML artifacts to the designated directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        vis_dir = Path(tmpdir) / "visuals"
        registry = SkillRegistry(visuals_dir=vis_dir)
        registry.register(Eli5Skill())

        out = registry.render("eli5", {
            "concept": "queue",
            "analogy": "Waiting in line at a cinema.",
            "mapping_question": "Who gets tickets first?",
        })

        assert out.file_path is not None
        p = Path(out.file_path)
        assert p.exists()
        assert p.suffix == ".html"
        content = p.read_text(encoding="utf-8")
        assert "cinema" in content

