"""Visualizer Agent choosing appropriate visual pedagogical skills and generating artifacts."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from core.llm import BaseLLMProvider, get_llm_client
from curriculum.store import CurriculumStore
from skills.registry import SkillRegistry, get_skill_registry

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "visualizer.txt"


class VisualizerDecision(BaseModel):
    """Decision produced by Visualizer selecting a skill and rendering specification."""

    chosen_skill: str = Field(
        ...,
        description="The selected skill identifier ('eli5', 'diagram', 'analogy', 'trace', 'plot').",
    )
    concept: str = Field(
        ...,
        description="The concept being visualized.",
    )
    visual_spec: Dict[str, Any] = Field(
        default_factory=dict,
        description="Specification dictionary passed into skill.render().",
    )
    reasoning: str = Field(
        ...,
        description="Pedagogical rationale for selecting this visual modality.",
    )


class VisualizerAgent:
    """Translates learning roadblocks into scaffolded visual artifacts with blanks."""

    def __init__(
        self,
        llm: Optional[BaseLLMProvider] = None,
        registry: Optional[SkillRegistry] = None,
        curriculum: Optional[CurriculumStore] = None,
    ) -> None:
        self.llm = llm or get_llm_client()
        self.registry = registry or get_skill_registry()
        self.curriculum = curriculum or CurriculumStore()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.base_prompt = f.read()

    def decide(
        self,
        concept: str,
        skill_type: Optional[str] = None,
        rung: int = 4,
        learner_level: str = "beginner",
        what_to_hide: Optional[str] = None,
    ) -> VisualizerDecision:
        """Choose or construct visual rendering specification."""
        # 1. Check curriculum store for pre-curated templates
        curriculum_entry = self.curriculum.get_concept(concept)
        if curriculum_entry:
            if skill_type == "diagram" or (not skill_type and rung == 4 and curriculum_entry.get("diagrams")):
                diag = curriculum_entry["diagrams"][0]
                return VisualizerDecision(
                    chosen_skill="diagram",
                    concept=concept,
                    visual_spec={
                        "concept": concept,
                        "mermaid_source": diag["mermaid_source"],
                        "blanks": diag.get("blanks", ["?BLANK?"]),
                        "prompt": diag.get("prompt", "What belongs in the blank?"),
                    },
                    reasoning=f"Curated diagram for {concept} with blanks preserving Socratic tension.",
                )
            if skill_type in ("eli5", "analogy") or (not skill_type and curriculum_entry.get("analogies")):
                an = curriculum_entry["analogies"][0]
                return VisualizerDecision(
                    chosen_skill=skill_type or "analogy",
                    concept=concept,
                    visual_spec={
                        "concept": concept,
                        "analogy": an["analogy"],
                        "mapping_question": an["mapping_question"],
                    },
                    reasoning=f"Curated pedagogical analogy for {concept}.",
                )

        # 2. Consult LLM if not in curriculum or specific custom need
        system_prompt = (
            f"{self.base_prompt}\n\n"
            f"REQUEST CONSTRAINTS:\n"
            f"- Concept: {concept}\n"
            f"- Preferred Skill Type: {skill_type or 'Agent Choice'}\n"
            f"- Hint Ladder Rung: Rung {rung}\n"
            f"- Learner Level: {learner_level}\n"
            f"- Must Stay Hidden (Blanks required): {what_to_hide or 'Final solution'}\n"
        )
        user_prompt = f"Design a visual explanation for '{concept}'. If rung < 7, ensure at least one blank or prediction."
        messages = [{"role": "user", "content": user_prompt}]

        try:
            return self.llm.complete_structured(
                schema=VisualizerDecision,
                messages=messages,
                system=system_prompt,
                temperature=0.2,
            )
        except Exception:
            # Fallback default decision
            return VisualizerDecision(
                chosen_skill=skill_type or "eli5",
                concept=concept,
                visual_spec={
                    "concept": concept,
                    "analogy": f"Think of {concept} as a stack of sequential steps where each relies on the previous.",
                    "mapping_question": "What is the very first step?",
                },
                reasoning="Fallback basic analogy.",
            )

    def render(
        self,
        concept: str,
        skill_type: Optional[str] = None,
        rung: int = 4,
        learner_level: str = "beginner",
        what_to_hide: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate and render the visual, returning HTML and local file path."""
        decision = self.decide(
            concept=concept,
            skill_type=skill_type,
            rung=rung,
            learner_level=learner_level,
            what_to_hide=what_to_hide,
        )

        spec = dict(decision.visual_spec)
        spec.setdefault("concept", concept)

        # Enforce blanks on rungs 1-6
        if rung < 7 and decision.chosen_skill == "diagram":
            src = spec.get("mermaid_source", "")
            if "?blank" not in src.lower() and "[ ? ]" not in src:
                # Inject blank node if missing
                spec["mermaid_source"] = src + "\n    style ?BLANK? fill:#f97316,stroke:#ea580c,stroke-width:2px"

        output = self.registry.render(decision.chosen_skill, spec)
        return {
            "skill": output.skill,
            "concept": output.concept,
            "html": output.html,
            "file_path": output.file_path,
            "has_blanks": output.has_blanks,
            "reasoning": decision.reasoning,
        }
