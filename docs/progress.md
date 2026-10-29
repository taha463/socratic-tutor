# Socratic Tutor v2 - Build Progress

This document tracks autonomous progress across the 11 build steps specified in `SPEC.md`.

## Step 1: Foundation
- [x] Move old code into `legacy/` preserving git history
- [x] Create `pyproject.toml` with dependencies and ruff/pytest configuration
- [x] Build `core/llm.py` with Mock, Anthropic, Gemini, OpenAI providers (mock runs without keys)
- [x] Build `storage/schema.sql` and SQLite database initializer / connection manager (`storage/db.py`)
- [x] Build `core/cli.py` skeleton
- [x] Verify CI checks: `python -m pytest` (12 passed) and `python -m ruff check` pass cleanly
- [x] Commit Step 1

## Step 2: Core Loop
- [x] Hint Ladder (`core/ladder.py`) with 7 rungs and escalation/de-escalation logic
- [x] Teacher Agent (`core/agents/teacher.py`, `core/agents/prompts/teacher.txt`)
- [x] Critic Agent (`core/agents/critic.py`, `core/agents/prompts/critic.txt`) with heuristic + semantic leak gates
- [x] Orchestrator (`core/orchestrator.py`) with max 2 rewrites loop and turn persistence
- [x] `python -m core.cli ask` end-to-end working on mock and real providers
- [x] Unit & integration tests: leak detection on 10 scripted turns, max 2 rewrites loop (all 35 tests passed)
- [x] Commit Step 2

## Step 3: Diagnostician + Learner Model
- [x] Diagnostician Agent (`core/agents/diagnostician.py`, `core/agents/prompts/diagnostician.txt`)
- [x] 3-question first-session diagnostic flow
- [x] Learner model persistence (`core/learner.py` with SQLite)
- [x] Bayesian Knowledge Tracing (BKT) mastery updates & Ebbinghaus forgetting curve decay
- [x] Behavioral signal adaptation (paste -> probe, idle -> visual ladder escalation)
- [x] Unit & integration tests for diagnostician & learner store (all 43 tests passed)
- [x] Commit Step 3

## Step 4: Skills v1 & Visualizer Agent
- [ ] Visualizer Agent (`core/agents/visualizer.py`, `core/agents/prompts/visualizer.txt`)
- [ ] Skill registry (`skills/registry.py`)
- [ ] `skills/eli5`
- [ ] `skills/diagram` (Mermaid blanks)
- [ ] `skills/analogy`
- [ ] Visual output written to `.socratic/visuals/`
- [ ] Curriculum store (`curriculum/`)
- [ ] Unit & integration tests
- [ ] Commit Step 4

## Step 5: Trace Skill (Sandboxed Execution)
- [ ] Trace sandbox (`skills/trace/sandbox.py`) with subprocess, hard 5s timeout, memory limit, forbidden imports/access
- [ ] HTML step-by-step execution trace viewer
- [ ] Predict-first, compare-second flow
- [ ] Security tests (infinite loops, timeout, network access, file system escape)
- [ ] Commit Step 5

## Step 6: Claude Code Adapter
- [ ] Skill specification (`adapters/claude_code/SKILL.md`)
- [ ] Slash command handlers (`/socratic <topic>`, `/socratic dashboard`, `/socratic review`)
- [ ] `AGENTS.md` for cross-agent compatibility
- [ ] `install.sh` installation script
- [ ] Verification tests
- [ ] Commit Step 6

## Step 7: Dashboard Generator
- [ ] Static HTML generator (`dashboard/build.py`) from SQLite
- [ ] Monthly mastery chart, streak tracker, weak topics, rung-usage trend
- [ ] Visual replay support
- [ ] CLI command `/socratic dashboard` and tests
- [ ] Commit Step 7

## Step 8: Evaluation Harness
- [ ] 4 Simulated Learner Personas (`beginner`, `frustrated`, `copier`, `strong`)
- [ ] 10 Scenarios in `eval/scenarios/` with ground truth and pre/post quizzes
- [ ] Independent LLM judge + rule-based leak detector
- [ ] Metrics calculator (leak rate, learning gain, visual vs text-only, critic on vs off)
- [ ] `eval/run.py` producing `eval/results/results.md` and JSON
- [ ] Commit Step 8

## Step 9: Web Adapter
- [ ] FastAPI backend (`adapters/web/backend.py`)
- [ ] Minimal web chat UI with inline Mermaid, SVG, sandboxed HTML iframe
- [ ] Client-side behavioral signals collector (paste, tab switch/blur, idle, rapid typing)
- [ ] Signal-driven pedagogical adaptation in Orchestrator/Teacher
- [ ] Privacy toggle & local dashboard view
- [ ] Integration and end-to-end tests
- [ ] Commit Step 9

## Step 10: Plugins & Extra Skills
- [ ] `plot` skill (Matplotlib/SVG plots for algorithms, complexity, ML)
- [ ] `three_d` plugin (Three.js / SVG isometric for spatial concepts)
- [ ] `manim` plugin (`plugins/manim/`, optional, disabled by default)
- [ ] Unit tests for plugins
- [ ] Commit Step 10

## Step 11: Polish & Verification Gate
- [ ] Comprehensive README with hero visual, 30-second quickstart, architecture diagram, eval results table, privacy section, legacy note
- [ ] `docs/architecture.md` and `docs/privacy.md`
- [ ] Full evaluation run with real numbers recorded
- [ ] Complete test suite verification (unit, integration, security, lint)
- [ ] Final commit and sign-off
