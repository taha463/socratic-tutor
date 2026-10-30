"""Skill registry and visual persistence engine for Socratic Tutor v2."""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

DEFAULT_VISUALS_DIR = Path(".socratic/visuals")


class VisualOutput(BaseModel):
    """Output produced by any pedagogical rendering skill."""

    skill: str
    concept: str
    html: str
    file_path: Optional[str] = None
    has_blanks: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


def wrap_in_html_page(title: str, body_content: str, extra_scripts: str = "") -> str:
    """Wrap raw visual HTML in a responsive, styled self-contained HTML document."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - Socratic Visualizer</title>
  <style>
    :root {{
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --accent: #38bdf8;
      --border: #334155;
      --blank-bg: #451a03;
      --blank-border: #f97316;
      --blank-text: #fdba74;
    }}
    body {{
      margin: 0;
      padding: 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      box-sizing: border-box;
    }}
    .visual-container {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      max-width: 760px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }}
    .visual-title {{
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent);
      margin-top: 0;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }}
    .blank-pill {{
      display: inline-block;
      background: var(--blank-bg);
      border: 2px dashed var(--blank-border);
      color: var(--blank-text);
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-weight: 600;
      font-family: monospace;
    }}
  </style>
  {extra_scripts}
</head>
<body>
  <div class="visual-container">
    <div class="visual-title">{title}</div>
    {body_content}
  </div>
</body>
</html>"""


class BaseSkill(ABC):
    """Abstract base class for all pedagogical visual skills."""

    name: str
    description: str

    @abstractmethod
    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        """Render the pedagogical visual from specification."""
        pass


class SkillRegistry:
    """Central registry tracking core skills and optional plugins."""

    def __init__(
        self,
        visuals_dir: Optional[Path] = None,
        auto_register_core: bool = True,
    ) -> None:
        env_dir = os.getenv("SOCRATIC_VISUALS_DIR")
        self.visuals_dir = visuals_dir or (Path(env_dir) if env_dir else DEFAULT_VISUALS_DIR)
        self.visuals_dir.mkdir(parents=True, exist_ok=True)
        self._skills: Dict[str, BaseSkill] = {}

        if auto_register_core:
            from skills.analogy.render import AnalogySkill
            from skills.diagram.render import DiagramSkill
            from skills.eli5.render import Eli5Skill
            from skills.plot.render import PlotSkill
            from skills.trace.render import TraceSkill

            self.register(Eli5Skill())
            self.register(DiagramSkill())
            self.register(AnalogySkill())
            self.register(TraceSkill())
            self.register(PlotSkill())

    def register(self, skill: BaseSkill) -> None:
        """Register a visual skill instance."""
        self._skills[skill.name.lower()] = skill

    def load_plugins(self) -> List[str]:
        """Discover and register optional plugins (three_d, manim)."""
        loaded = []
        try:
            from plugins.three_d.render import ThreeDSkill
            self.register(ThreeDSkill())
            loaded.append("three_d")
        except Exception:
            pass

        try:
            from plugins.manim.render import ManimSkill
            self.register(ManimSkill())
            loaded.append("manim")
        except Exception:
            pass
        return loaded

    def get(self, name: str) -> Optional[BaseSkill]:
        """Look up skill by name."""
        return self._skills.get(name.lower())

    def list_skills(self) -> List[str]:
        """List registered skill names."""
        return list(self._skills.keys())

    def render(self, skill_name: str, spec: Dict[str, Any]) -> VisualOutput:
        """Dispatch rendering to chosen skill and write local HTML artifact."""
        clean_name = skill_name.lower()
        skill = self._skills.get(clean_name)
        if not skill:
            raise KeyError(f"Skill '{skill_name}' not registered. Available: {self.list_skills()}")

        output = skill.render(spec)

        # Write to file for Claude Code CLI and local browser inspection
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_concept = spec.get("concept", "concept").replace(" ", "_").replace("/", "_")
        filename = f"{safe_concept}_{clean_name}_{timestamp}.html"
        out_path = self.visuals_dir / filename

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(output.html)

        output.file_path = str(out_path.resolve())
        return output


_GLOBAL_REGISTRY: Optional[SkillRegistry] = None


def get_skill_registry() -> SkillRegistry:
    """Return singleton global skill registry with core skills registered."""
    global _GLOBAL_REGISTRY
    if _GLOBAL_REGISTRY is None:
        _GLOBAL_REGISTRY = SkillRegistry(auto_register_core=True)
        _GLOBAL_REGISTRY.load_plugins()
    return _GLOBAL_REGISTRY
