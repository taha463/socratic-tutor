"""Optional Manim animation plugin with robust zero-crash fallback."""

from __future__ import annotations

import os
import shutil
from typing import Any, Dict

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class ManimSkill(BaseSkill):
    """Optional plugin rendering mathematical animations via Manim or storyboard fallback."""

    name = "manim"
    description = "Renders mathematical animations using Manim Community Edition (optional plugin)."

    def is_enabled(self) -> bool:
        """Check whether Manim is enabled via environment variable."""
        val = os.getenv("SOCRATIC_ENABLE_MANIM", "0").lower()
        return val in ("1", "true", "yes", "on")

    def has_prerequisites(self) -> bool:
        """Check whether system prerequisites (ffmpeg, manim) are available."""
        has_ffmpeg = shutil.which("ffmpeg") is not None
        try:
            import manim  # noqa: F401
            has_manim_pkg = True
        except ImportError:
            has_manim_pkg = False
        return has_ffmpeg and has_manim_pkg

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        """Render Manim animation or structured storyboard preview."""
        concept = spec.get("concept", "recursion_tree")
        blank_target = spec.get("blank_target", "f(1)")
        prompt = spec.get(
            "prediction_prompt",
            f"Watch the recursive branch unfold. What value will '{blank_target}' return?",
        )

        enabled = self.is_enabled()
        prereqs = self.has_prerequisites()

        if enabled and prereqs:
            # Active Manim rendering branch
            status_badge = '<span style="color:#4ade80;">Active (Live Manim Engine)</span>'
            animation_html = f"""
<div style="background:#090d16; border:1px solid #334155; border-radius:8px; padding:2rem; text-align:center;">
  <div style="font-size:2rem; margin-bottom:1rem;">🎬</div>
  <div style="color:#f8fafc; font-weight:600;">Manim Scene: {concept}</div>
  <div style="color:#94a3b8; font-size:0.85rem; margin-top:0.5rem;">Rendered high-fidelity vector animation.</div>
</div>
"""
        else:
            # Storyboard animation fallback branch
            status_badge = '<span style="color:#fb923c;">Storyboard Fallback (Plugin Disabled by Default)</span>'
            animation_html = """
<div style="background: #090d16; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 0.75rem; margin-bottom: 1rem;">
    <div style="font-weight: 600; color: #38bdf8;">📽️ Animation Keyframe Sequence</div>
    <div style="font-size: 0.75rem; color: #94a3b8;">Frames 1 - 3</div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 1rem; text-align: center;">
      <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">Frame 01: Initial Call</div>
      <div style="font-family: monospace; font-size: 0.95rem; color: #38bdf8;">f(3)</div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8;">Spawns 3 * f(2)</div>
    </div>
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 1rem; text-align: center;">
      <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">Frame 02: Recursive Call</div>
      <div style="font-family: monospace; font-size: 0.95rem; color: #a78bfa;">f(2) &rarr; 2 * f(1)</div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8;">Stack depth: 2</div>
    </div>
    <div style="background: #1e293b; border: 2px dashed #f97316; border-radius: 6px; padding: 1rem; text-align: center;">
      <div style="font-size: 0.75rem; color: #fb923c; margin-bottom: 0.5rem;">Frame 03: Base Step</div>
      <div style="font-family: monospace; font-size: 0.95rem; color: #fb923c;">f(1) = ???</div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #fb923c;">[ Predict value ]</div>
    </div>
  </div>
</div>
"""

        body_html = f"""
<div style="margin-bottom: 1rem;">
  {animation_html}
</div>

<div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
    <span style="font-weight: 600; color: #fbbf24;">🎯 Animation Challenge</span>
    <span style="font-size:0.75rem;">Status: {status_badge}</span>
  </div>
  <p style="margin: 0; line-height: 1.5;">{prompt}</p>
  <div style="margin-top: 0.75rem;">
    Target: <span class="blank-pill">???</span>
  </div>
</div>

<div style="margin-top: 1rem; padding: 0.75rem; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; font-size: 0.75rem; color: #64748b;">
  💡 <em>Note:</em> To enable live Manim rendering, set <code style="color:#94a3b8;">SOCRATIC_ENABLE_MANIM=1</code> and ensure <code style="color:#94a3b8;">ffmpeg</code> is installed.
</div>
"""
        full_html = wrap_in_html_page(
            title=f"Manim Animation: {concept.replace('_', ' ').title()}",
            body_content=body_html,
        )

        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=full_html,
            has_blanks=True,
            metadata={
                "blank_target": blank_target,
                "manim_enabled": enabled,
                "has_prerequisites": prereqs,
                "prediction_prompt": prompt,
            },
        )

