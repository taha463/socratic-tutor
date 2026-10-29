"""Agents package for Socratic Tutor v2."""

from core.agents.critic import CriticAgent, CriticVerdict
from core.agents.diagnostician import DiagnosticianAgent, DiagnosticResult
from core.agents.teacher import TeacherAgent, TeacherDraft
from core.agents.visualizer import VisualizerAgent, VisualizerDecision

__all__ = [
    "CriticAgent",
    "CriticVerdict",
    "DiagnosticianAgent",
    "DiagnosticResult",
    "TeacherAgent",
    "TeacherDraft",
    "VisualizerAgent",
    "VisualizerDecision",
]
