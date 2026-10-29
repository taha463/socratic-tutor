"""Agents package for Socratic Tutor v2."""

from core.agents.critic import CriticAgent, CriticVerdict
from core.agents.teacher import TeacherAgent, TeacherDraft

__all__ = ["CriticAgent", "CriticVerdict", "TeacherAgent", "TeacherDraft"]
