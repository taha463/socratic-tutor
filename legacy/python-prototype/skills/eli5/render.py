"""ELI5 (Explain Like I'm 5) pedagogical skill."""

from __future__ import annotations

from typing import Any, Dict

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class Eli5Skill(BaseSkill):
    name = "eli5"
    description = "Presents an intuitive everyday analogy and a concrete mapping question."

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        concept = spec.get("concept", "General Concept")
        analogy = spec.get("analogy", "Think of a simple real-world process.")
        mapping_question = spec.get("mapping_question", "How does this connect to your code?")

        body = f"""
        <div style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; color: #cbd5e1;">
          <p>💡 <strong>Everyday Analogy:</strong></p>
          <blockquote style="margin: 0; padding: 1rem; background: #0f172a; border-left: 4px solid #38bdf8; border-radius: 4px;">
            {analogy}
          </blockquote>
        </div>
        <div style="background: #172554; border: 1px solid #1e40af; border-radius: 8px; padding: 1.25rem;">
          <strong style="color: #60a5fa;">🎯 Mapping Challenge:</strong>
          <p style="margin: 0.5rem 0 0 0; color: #e2e8f0; font-size: 1.05rem;">{mapping_question}</p>
        </div>
        """
        html = wrap_in_html_page(title=f"ELI5: {concept.title()}", body_content=body)
        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=html,
            has_blanks=True,
            metadata={"analogy": analogy, "mapping_question": mapping_question},
        )

