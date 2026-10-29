# AGENTS.md: Developer & Agent Guide for Socratic Tutor v2

This document guides AI coding assistants (Claude Code, Cursor, Codex, Gemini, Antigravity) working within this repository.

## 1. System Overview
Socratic Tutor v2 is a local-first pedagogical framework that **never gives the answer directly**.
It replaces centralized server stacks (Celery/Redis/Mongo) with an in-process SQLite architecture.

Key modules:
- `core/orchestrator.py`: Multi-agent turn loop coordinator.
- `core/ladder.py`: 7-rung pedagogical hint ladder (Probe -> Narrow Question -> Analogy -> Visual -> Worked Example -> Partial Reveal -> Full Explanation + Check).
- `core/agents/`:
  - `diagnostician.py`: Monitors frustration, behavioral signals, and recommends ladder rungs.
  - `teacher.py`: Drafts responses observing the One-Question Rule and zero answer leakage.
  - `critic.py`: Uncompromising synchronous quality gate that flags leaks, multiple questions, and code dumps.
  - `visualizer.py`: Picks appropriate skills and creates artifacts with blanks.
- `skills/`:
  - `eli5`: Everyday analogies with mapping challenges.
  - `diagram`: Mermaid diagrams with blanks.
  - `trace`: Sandboxed Python execution tracer with predict/compare interactive HTML viewer.
  - `analogy`: Curriculum mental models.
  - `plot`: Mathematical and algorithmic complexity plots.
- `curriculum/`: Tested pedagogical analogies and diagram templates.
- `storage/`: SQLite database with schema for learners, sessions, turns, mastery, mistakes, signals.

## 2. CLI Execution
Whenever interacting with a learner, agents must invoke the Python core CLI so pedagogical rules and Critic gates run deterministically:
```bash
# Ask a question / submit a learner response
python -m core.cli ask "<message>" --session "<id>" --topic "<topic>"

# View mastery dashboard
python -m core.cli dashboard

# Review weak concepts
python -m core.cli review
```

## 3. Testing & Verification Gate
Every modification must pass all unit and integration tests and static analysis:
```bash
python -m pytest
python -m ruff check .
```
Never mock away the core behavior under test or weaken assertions.
