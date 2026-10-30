"""Plot skill rendering algorithmic complexity curves and optimization landscapes."""

from __future__ import annotations

import io
from typing import Any, Dict

import matplotlib

matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import numpy as np

from skills.registry import BaseSkill, VisualOutput, wrap_in_html_page


class PlotSkill(BaseSkill):
    """Renders mathematical and algorithmic function plots with pedagogical blanks."""

    name = "plot"
    description = "Generates complexity curves, gradient descent steps, and algorithmic graphs."

    def render(self, spec: Dict[str, Any]) -> VisualOutput:
        """Render a plot visual from specification with masked elements."""
        concept = spec.get("concept", "algorithmic_complexity")
        plot_type = spec.get("plot_type", "big_o")
        blank_target = spec.get("blank_target", "O(n log n)")
        prompt = spec.get(
            "prediction_prompt",
            f"Inspect the curves above. Which curve represents '{blank_target}'?",
        )

        svg_content = self._generate_plot_svg(concept, plot_type, blank_target)

        body_html = f"""
<div style="text-align: center; margin-bottom: 1.5rem;">
  {svg_content}
</div>

<div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
  <div style="font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem;">🎯 Pedagogical Challenge</div>
  <p style="margin: 0; line-height: 1.5;">{prompt}</p>
  <div style="margin-top: 0.75rem;">
    Target to identify: <span class="blank-pill">???</span>
  </div>
</div>
"""
        full_html = wrap_in_html_page(
            title=f"Plot Challenge: {concept.replace('_', ' ').title()}",
            body_content=body_html,
        )

        return VisualOutput(
            skill=self.name,
            concept=concept,
            html=full_html,
            has_blanks=True,
            metadata={
                "blank_target": blank_target,
                "plot_type": plot_type,
                "prediction_prompt": prompt,
            },
        )

    def _generate_plot_svg(self, concept: str, plot_type: str, blank_target: str) -> str:
        """Generate styled dark-mode SVG using matplotlib."""
        plt.style.use("dark_background")
        fig, ax = plt.subplots(figsize=(7, 4.5), facecolor="#0f172a")
        ax.set_facecolor("#1e293b")

        if plot_type == "gradient_descent":
            # Loss parabola: f(w) = w^2
            w = np.linspace(-4, 4, 200)
            loss = w**2
            ax.plot(w, loss, label="Loss Curve L(w) = w^2", color="#38bdf8", linewidth=2.5)

            # Gradient descent steps: w0=3.5, w1=2.1, w2=1.2, w3=0.7
            steps = [3.5, 2.1, 1.2, 0.7]
            step_losses = [s**2 for s in steps]
            ax.scatter(steps[:-1], step_losses[:-1], color="#4ade80", s=60, zorder=5, label="Prior Steps (wt)")
            for i in range(len(steps) - 2):
                ax.annotate(
                    "",
                    xy=(steps[i+1], step_losses[i+1]),
                    xytext=(steps[i], step_losses[i]),
                    arrowprops=dict(arrowstyle="->", color="#4ade80", lw=1.8),
                )
            # Mask the next step
            ax.scatter([steps[-1]], [step_losses[-1]], color="#fb923c", s=100, marker="x", zorder=6, label="Step [ ??? ]")
            ax.set_title("Gradient Descent Optimization Trajectory", color="#f8fafc", pad=12, fontsize=12)
            ax.set_xlabel("Parameter Weight (w)", color="#94a3b8")
            ax.set_ylabel("Loss L(w)", color="#94a3b8")

        else:
            # Default: Big-O Curves
            n = np.linspace(1, 16, 150)
            y_const = np.ones_like(n)
            y_log = np.log2(n)
            y_linear = n
            y_nlogn = n * np.log2(n)
            y_quad = n**2

            ax.plot(n, y_const, label="O(1) Constant", color="#94a3b8", linewidth=2)
            ax.plot(n, y_log, label="O(log n) Logarithmic", color="#38bdf8", linewidth=2)
            ax.plot(n, y_linear, label="O(n) Linear", color="#4ade80", linewidth=2)

            # Check if O(n log n) or O(n^2) is blank target
            if "log" in blank_target.lower():
                ax.plot(n, y_nlogn, label="[ BLANK: Curve A ]", color="#fb923c", linewidth=3, linestyle="--")
                ax.plot(n, y_quad, label="O(n^2) Quadratic", color="#f87171", linewidth=2)
            else:
                ax.plot(n, y_nlogn, label="O(n log n) Linearithmic", color="#c084fc", linewidth=2)
                ax.plot(n, y_quad, label="[ BLANK: Curve B ]", color="#fb923c", linewidth=3, linestyle="--")

            ax.set_ylim(0, 35)
            ax.set_xlim(1, 16)
            ax.set_title("Algorithmic Growth Comparison", color="#f8fafc", pad=12, fontsize=12)
            ax.set_xlabel("Input Size (n)", color="#94a3b8")
            ax.set_ylabel("Operations / Step Count", color="#94a3b8")

        ax.grid(True, linestyle=":", alpha=0.3, color="#64748b")
        ax.legend(loc="upper left", framealpha=0.8, facecolor="#0f172a", edgecolor="#334155", fontsize=9)

        for spine in ax.spines.values():
            spine.set_color("#334155")
        ax.tick_params(colors="#94a3b8")

        buf = io.StringIO()
        fig.savefig(buf, format="svg", bbox_inches="tight", transparent=False)
        plt.close(fig)

        svg_str = buf.getvalue()
        # Strip xml declaration if present for clean inline embedding
        if "<svg" in svg_str:
            svg_str = svg_str[svg_str.find("<svg"):]
        return svg_str

