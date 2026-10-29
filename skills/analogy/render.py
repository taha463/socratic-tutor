"""Analogy pedagogical skill pulling tested analogies from curriculum or generating custom ones."""

from __future__ import annotations

from typing import Any, Dict

from curriculum.store import CurriculumStore
from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class AnalogySkill(BaseSkill):
    name = "analogy"
    description = "Provides tested analogies from curriculum or generates custom metaphors."

    def __init__(self, curriculum: CurriculumStore | None = None) -> None:
        self.curriculum = curriculum or CurriculumStore()

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        concept = spec.get("concept", "general")
        analogy_text = spec.get("analogy")
        mapping_question = spec.get("mapping_question")

        # Fallback to curriculum if analogy not explicitly provided
        if not analogy_text:
            curriculum_item = self.curriculum.get_analogy(concept)
            if curriculum_item:
                analogy_text = curriculum_item.get("analogy")
                mapping_question = mapping_question or curriculum_item.get("mapping_question")

        analogy_text = analogy_text or f"Think of {concept} as an organized physical workflow with step-by-step rules."
        mapping_question = mapping_question or "How would the first step of this workflow look in code?"

        body = f"""
        <div style="background: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="color: #a5b4fc; margin-top: 0;">🔮 The Mental Model</h3>
          <p style="font-size: 1.15rem; line-height: 1.6; color: #e0e7ff; margin: 0;">
            {analogy_text}
          </p>
        </div>
        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem;">
          <strong style="color: #38bdf8;">🧭 Transfer Question:</strong>
          <p style="margin: 0.5rem 0 0 0; color: #cbd5e1; font-size: 1.05rem;">
            {mapping_question}
          </p>
        </div>
        """
        html = wrap_in_html_page(title=f"Analogy: {concept.title()}", body_content=body)
        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=html,
            has_blanks=True,
            metadata={"analogy": analogy_text, "mapping_question": mapping_question},
        )
