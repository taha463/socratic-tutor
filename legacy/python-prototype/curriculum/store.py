"""Curriculum repository loading pedagogical analogies, concepts, and diagrams."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

CURRICULUM_DIR = Path(__file__).resolve().parent


class CurriculumStore:
    """Manages access to curated pedagogical curriculum entries."""

    def __init__(self, directory: Optional[Path] = None) -> None:
        self.directory = directory or CURRICULUM_DIR
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._load_all()

    def _load_all(self) -> None:
        if not self.directory.exists():
            return
        for file in self.directory.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cid = data.get("concept_id") or file.stem
                    self._cache[cid] = data
            except Exception:
                continue

    def get_concept(self, concept_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve concept by exact ID or fuzzy normalized key."""
        clean_id = concept_id.lower().replace("-", "_").replace(" ", "_")
        if clean_id in self._cache:
            return self._cache[clean_id]
        # Match substring
        for k, v in self._cache.items():
            if clean_id in k or k in clean_id:
                return v
        return None

    def get_analogy(self, concept_id: str) -> Optional[Dict[str, str]]:
        """Retrieve tested real-world analogy for a concept."""
        concept = self.get_concept(concept_id)
        if concept and concept.get("analogies"):
            return concept["analogies"][0]
        return None

    def get_diagram(self, concept_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve scaffolded Mermaid diagram with blanks for a concept."""
        concept = self.get_concept(concept_id)
        if concept and concept.get("diagrams"):
            return concept["diagrams"][0]
        return None

    def list_concepts(self) -> List[str]:
        return list(self._cache.keys())

