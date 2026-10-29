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
- [x] Visualizer Agent (`core/agents/visualizer.py`, `core/agents/prompts/visualizer.txt`)
- [x] Skill registry (`skills/registry.py`) with automatic artifact writing to `.socratic/visuals/`
- [x] `skills/eli5` with analogy card and mapping challenge
- [x] `skills/diagram` with Mermaid dark mode, blanks enforcement, and prediction prompt
- [x] `skills/analogy` with curriculum mental model and transfer questions
- [x] Curriculum store (`curriculum/`) with pre-tested analogies and diagram templates
- [x] Unit & integration tests for skills and visualizer (all 50 tests passed)
- [x] Commit Step 4

## Step 5: Trace Skill (Sandboxed Execution)
- [x] Trace sandbox (`skills/trace/sandbox.py`) with subprocess, hard 5s timeout, AST safety guards against forbidden modules/calls
- [x] Interactive two-column step-by-step HTML execution viewer (`skills/trace/render.py`) with call stack, variables, and stdout
- [x] Predict-first, compare-second pedagogical flow
- [x] Security tests (infinite loops, timeout, network access, forbidden imports - all passed, 55 tests total)
- [x] Commit Step 5

## Step 6: Claude Code Adapter
- [x] Skill specification (`adapters/claude_code/SKILL.md`) with slash command routing to Python core CLI
- [x] Cross-agent specification (`AGENTS.md`) documenting CLI and architecture
- [x] Autonomous installation scripts (`install.sh` and `install.ps1`) for sub-minute zero-config setup
- [x] Verified `/socratic teach me recursion` execution in fresh environment (all 59 tests passed)
- [x] Commit Step 6

## Step 7: Dashboard Generator
- [x] Static HTML generator (`dashboard/build.py`) from SQLite
- [x] Monthly concept mastery progression, consecutive day streaks, and sessions per week
- [x] Weak topics list with recommended next practice and mistake patterns
- [x] Hint ladder usage trend (fading scaffolding metric)
- [x] Visual and execution trace replay gallery
- [x] CLI command `/socratic dashboard` and tests (all 63 tests passed)
- [x] Commit Step 7

## Step 8: Evaluation Harness
- [x] 4 Simulated Learner Personas (`beginner`, `frustrated`, `copier`, `strong`)
- [x] 10 Scenarios in `eval/scenarios/` with ground truth and pre/post quizzes
- [x] Independent LLM judge + rule-based leak detector (`eval/judge.py`)
- [x] Metrics calculator (leak rate, learning gain, visual vs text-only, critic on vs off)
- [x] `eval/run.py` producing `eval/results/results.md` and JSON
- [x] Commit Step 8

## Step 9: Web Adapter
- [x] FastAPI backend (`adapters/web/backend.py`)
- [x] Minimal web chat UI with inline Mermaid, SVG, sandboxed HTML iframe
- [x] Client-side behavioral signals collector (paste, tab switch/blur, idle, rapid typing)
- [x] Signal-driven pedagogical adaptation in Orchestrator/Teacher
- [x] Privacy toggle & local dashboard view
- [x] Integration and end-to-end tests
- [x] Commit Step 9

## Step 10: Plugins & Extra Skills
- [x] `plot` skill (Matplotlib/SVG plots for algorithms, complexity, ML)
- [x] `three_d` plugin (Three.js / SVG isometric for spatial concepts)
- [x] `manim` plugin (`plugins/manim/`, optional, disabled by default)
- [x] Unit tests for plugins
- [x] Commit Step 10

## Step 11: Polish & Verification Gate
- [ ] Comprehensive README with hero visual, 30-second quickstart, architecture diagram, eval results table, privacy section, legacy note
- [ ] `docs/architecture.md` and `docs/privacy.md`
- [ ] Full evaluation run with real numbers recorded
- [ ] Complete test suite verification (unit, integration, security, lint)
- [ ] Final commit and sign-off
