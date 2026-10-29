"""Diagram pedagogical skill rendering Mermaid graphs with blanks."""

from __future__ import annotations

from typing import Any, Dict

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class DiagramSkill(BaseSkill):
    name = "diagram"
    description = "Renders structured Mermaid diagrams with blank nodes for prediction."

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        concept = spec.get("concept", "Architecture Diagram")
        mermaid_source = spec.get("mermaid_source", "graph TD\n    A[Input] --> B[?BLANK?]")
        prompt = spec.get("prompt", "What belongs inside the blank node?")
        blanks = spec.get("blanks", ["?BLANK?"])

        has_blanks = any(b in mermaid_source for b in blanks) or "?blank" in mermaid_source.lower()

        mermaid_script = """
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
          mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            securityLevel: 'loose'
          });
        </script>
        """

        body = f"""
        <div style="background: #020617; border-radius: 8px; padding: 1.5rem; display: flex; justify-content: center; overflow-x: auto; margin-bottom: 1.5rem;">
          <pre class="mermaid" style="font-family: monospace;">
{mermaid_source}
          </pre>
        </div>
        <div style="background: #172554; border: 1px solid #1e40af; border-radius: 8px; padding: 1.25rem;">
          <strong style="color: #38bdf8;">🧩 Prediction Prompt:</strong>
          <p style="margin: 0.5rem 0 0 0; color: #f1f5f9; font-size: 1.05rem;">{prompt}</p>
        </div>
        """
        html = wrap_in_html_page(
            title=f"Diagram: {concept.title()}",
            body_content=body,
            extra_scripts=mermaid_script,
        )
        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=html,
            has_blanks=has_blanks,
            metadata={"mermaid_source": mermaid_source, "prompt": prompt, "blanks": blanks},
        )

