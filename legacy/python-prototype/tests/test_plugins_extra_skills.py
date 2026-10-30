"""Unit and integration tests for plot skill and optional plugins (three_d, manim)."""

from __future__ import annotations

import tempfile
from pathlib import Path

from plugins.manim.render import ManimSkill
from plugins.three_d.render import ThreeDSkill
from skills.plot.render import PlotSkill
from skills.registry import SkillRegistry


def test_plot_skill_big_o():
    """Verify plot skill produces dark-mode SVG with masked curve challenge."""
    skill = PlotSkill()
    spec = {
        "concept": "big_o_complexity",
        "plot_type": "big_o",
        "blank_target": "O(n log n)",
        "prediction_prompt": "Which curve represents O(n log n)?",
    }
    output = skill.render(spec)

    assert output.skill == "plot"
    assert output.has_blanks is True
    assert "<svg" in output.html
    assert "Algorithmic Growth Comparison" in output.html
    assert "BLANK: Curve" in output.html
    assert "Which curve represents O(n log n)?" in output.html


def test_plot_skill_gradient_descent():
    """Verify plot skill produces gradient descent optimization trajectory with blanks."""
    skill = PlotSkill()
    spec = {
        "concept": "gradient_descent",
        "plot_type": "gradient_descent",
        "blank_target": "w_next",
        "prediction_prompt": "Which direction will parameter w update next?",
    }
    output = skill.render(spec)

    assert output.skill == "plot"
    assert "<svg" in output.html
    assert "Optimization Trajectory" in output.html
    assert "Which direction will parameter w update next?" in output.html


def test_three_d_plugin_render():
    """Verify Three.js 3D spatial plugin generates responsive WebGL viewer with blanks."""
    skill = ThreeDSkill()
    spec = {
        "concept": "3d_matrix_rotation",
        "blank_target": "[0, 1, 0]",
        "prediction_prompt": "What is the new coordinate of basis vector î after 90° rotation?",
    }
    output = skill.render(spec)

    assert output.skill == "three_d"
    assert output.has_blanks is True
    assert "three.min.js" in output.html
    assert "OrbitControls.js" in output.html
    assert "threejs-canvas-container" in output.html
    assert "3D Spatial Challenge" in output.html
    assert "What is the new coordinate" in output.html


def test_manim_plugin_disabled_by_default(monkeypatch):
    """Verify Manim plugin returns zero-crash storyboard fallback when disabled."""
    monkeypatch.delenv("SOCRATIC_ENABLE_MANIM", raising=False)
    skill = ManimSkill()
    assert skill.is_enabled() is False

    spec = {
        "concept": "recursion_stack_unwinding",
        "blank_target": "f(1)",
        "prediction_prompt": "What value will the base case f(1) return?",
    }
    output = skill.render(spec)

    assert output.skill == "manim"
    assert output.has_blanks is True
    assert "Storyboard Fallback" in output.html
    assert "Animation Keyframe Sequence" in output.html
    assert "SOCRATIC_ENABLE_MANIM=1" in output.html


def test_manim_plugin_enabled_flag(monkeypatch):
    """Verify Manim recognizes activation flag."""
    monkeypatch.setenv("SOCRATIC_ENABLE_MANIM", "1")
    skill = ManimSkill()
    assert skill.is_enabled() is True


def test_skill_registry_with_plugins():
    """Verify SkillRegistry registers plot skill and loads optional plugins."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        registry = SkillRegistry(visuals_dir=Path(tmp_dir), auto_register_core=True)
        plugins_loaded = registry.load_plugins()

        assert "three_d" in plugins_loaded
        assert "manim" in plugins_loaded

        all_skills = registry.list_skills()
        assert "plot" in all_skills
        assert "three_d" in all_skills
        assert "manim" in all_skills
        assert "trace" in all_skills
        assert "diagram" in all_skills
        assert "eli5" in all_skills
        assert "analogy" in all_skills

        # Render through registry and verify artifact writing
        plot_out = registry.render("plot", {"concept": "sorting_complexity"})
        assert Path(plot_out.file_path).exists()
        assert "<svg" in Path(plot_out.file_path).read_text(encoding="utf-8")

        three_d_out = registry.render("three_d", {"concept": "vector_transforms"})
        assert Path(three_d_out.file_path).exists()
        assert "three.min.js" in Path(three_d_out.file_path).read_text(encoding="utf-8")

