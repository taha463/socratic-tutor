# Socratic Tutor v2: Full Project Spec

> Hand this file to a coding agent (Claude Code). Read all of it first, then build the whole system in the order given in section 14. Work autonomously: one task at a time, run what you build, commit after each task, never leave fake-green or placeholder code.

---

## 1. Vision

A Socratic tutor that **never gives the answer directly** but still makes the learner *see* the idea. It combines:

- Socratic questioning (core behavior)
- Visual explanations (diagrams, ELI5, code execution traces, analogies, optional 3D/animation)
- A hint ladder so complete beginners are never stuck in a loop
- Four cooperating agents with distinct jobs
- Behavioral signals (typing, paste, tab switching) used to adapt teaching, not to punish
- A progress dashboard (monthly mastery, streaks, weak topics)
- An evaluation harness with simulated students that produces real numbers

It must be **installable and runnable in under a minute**:

```
git clone <repo> && cd socratic-tutor && ./install.sh
```

Then either use it inside Claude Code (`/socratic teach me recursion`) or open the web UI. No Docker, no Redis, no Celery, no MongoDB. Python + SQLite only.

This repo is an evolution of the existing `fehm-ai-engine` (Celery/Redis/Mongo multi-agent tutor). Move the old code into `legacy/` and keep its git history so the evolution is visible. State this in the README.

## 2. Design principles

1. **Show structure, hide the answer.** Visuals contain blanks, predictions, or partial states. The learner fills them in.
2. **Predict, run, compare.** For code and processes: ask the learner to predict first, then reveal the real result.
3. **Never leave a learner stuck.** Escalate through the hint ladder; the final rungs reveal progressively more, but always with an explanation and a follow-up check.
4. **Adapt, don't police.** Behavioral signals change the teaching strategy. They never block, accuse, or shame.
5. **Local and private.** All learner data in a local SQLite file. No telemetry. Say exactly what is tracked in the README.
6. **Simple core, optional extras.** Manim and 3D are plugins and must not be required for core to run.
7. **Measurable.** Every claim ("doesn't leak answers", "visuals help") must be backed by the eval harness.

## 3. Non-goals

- Not a proctoring or surveillance tool. No webcam, no screen recording, no blocking.
- Not a general chatbot. Teaching sessions only.
- No distributed infrastructure.

## 4. Architecture

One Python core, two adapters (doors).

```
            ┌────────────────────────────────────────────┐
            │                   core/                    │
 Claude ───►│  orchestrator ─► Diagnostician              │
 Code       │        │         Teacher ◄─► Visualizer ─► skills/
 adapter    │        │         Critic (gate on every reply)│
            │        ▼                                     │
 Web   ────►│  hint ladder · learner model · llm client   │
 adapter    └──────────────┬─────────────────────────────┘
                           ▼
                  storage/ (SQLite) ─► dashboard/
```

### Turn flow (every learner message)

1. Adapter sends `{session_id, learner_message, signals}` to the orchestrator.
2. **Diagnostician** reads message + signals + learner model, outputs: `level`, `frustration` (0-1), `state` (LEARNING / STUCK / MASTERY / COPYING_SUSPECTED), `recommended_rung` on the hint ladder.
3. **Teacher** drafts a reply using the recommended rung. If a visual would help, it asks the Visualizer.
4. **Visualizer** picks the best skill for this concept and returns a visual (with blanks) or none.
5. **Critic** reviews the draft: does it leak the answer? Is it more than one question? Is the visual correct and does it hide what it should? If it fails, return feedback to the Teacher for one rewrite (max 2 rewrites), then send.
6. Orchestrator updates the learner model, logs the turn, returns the reply to the adapter.

## 5. Agents

All agents are defined as prompt files in `core/agents/prompts/` plus a thin Python class. Output of each agent is validated JSON (use pydantic).

| Agent | Input | Output | Rules |
|---|---|---|---|
| **Diagnostician** | message, signals, history, learner model | level, frustration, state, recommended_rung, reasoning | Cheap and fast. Runs every turn. First session: runs a 3-question diagnostic. |
| **Teacher** | diagnosis, topic, history, learner model | reply text, optional visual request | One question per reply. No code dumps. No direct final answers until the final rung. Warm tone, adapts to frustration. |
| **Visualizer** | concept, learner level, what must stay hidden | chosen skill + rendered visual | Chooses among skills (section 7). Must output visuals with at least one blank/prediction when the learner is not on the final rungs. |
| **Critic** | draft reply, visual, ground truth answer (if known) | pass/fail, issues, rewrite instructions | Checks: answer leak, multiple questions, tone vs frustration, visual correctness, visual hides what it should. Logs every verdict for eval. |

Librarian from v1 is **not an agent**. It becomes `curriculum/` (a folder of concepts, tested analogies and visual templates as markdown/JSON) that the Teacher and Visualizer read.

## 6. Hint ladder (`core/ladder.py`)

Rungs, in order:

1. **Probe**: ask what the learner already thinks or tried.
2. **Narrow question**: a smaller, more concrete question.
3. **Analogy / ELI5**: everyday analogy, then ask them to map it back.
4. **Visual with blanks**: diagram or trace with missing pieces.
5. **Worked example of a similar problem**: solve a *different* problem fully, then ask them to apply it.
6. **Partial reveal**: reveal the key step with explanation, ask them to finish.
7. **Full explanation + check**: only after repeated failure; then immediately ask a transfer question to verify understanding.

Rules:
- Start at the rung suggested by the Diagnostician (complete beginners may start at 3 or 4).
- Escalate after N failed attempts (default 2, configurable) or when frustration > 0.7.
- De-escalate (fade scaffolding) after successes.
- Never stay on the same rung more than 3 turns.

## 7. Skills (`skills/`)

Each skill is a self-contained module with a `SKILL.md` (when to use, inputs, outputs, examples) and a Python function `render(spec) -> Visual`. A registry (`skills/registry.py`) lets the Visualizer choose by concept type.

| Skill | Use for | Output | Core or plugin |
|---|---|---|---|
| `eli5` | Any concept, simple analogy | Short text with analogy + a mapping question | core |
| `diagram` | Flows, hierarchies, data structures, architectures | Mermaid or SVG, with blank nodes | core |
| `trace` | Code questions | Runs the learner's code in a sandbox, generates an HTML step-by-step execution trace (call stack, variables). Learner predicts first, then trace is revealed. | core |
| `analogy` | Abstract concepts | Picks from `curriculum/` analogies or generates one | core |
| `plot` | Math / ML / algorithms | Matplotlib or SVG plots (e.g. gradient descent steps, complexity curves) | core |
| `three_d` | Spatial concepts (matrices, transforms, geometry) | Three.js HTML or SVG isometric | optional plugin |
| `manim` | Deep-dive animations | Rendered video/GIF | optional plugin (`plugins/manim/`), needs ffmpeg/Cairo/LaTeX, disabled by default |

Requirements:
- Visuals must render in the browser (web adapter) **and** be openable as local HTML files from Claude Code (write to `.socratic/visuals/` and print the path).
- The `trace` sandbox: subprocess, hard timeout (5s), memory limit, no network, no file writes outside a temp dir. Python first; JavaScript later.
- Every skill has unit tests.

## 8. Learner model (`core/learner.py`, SQLite)

Tables (minimum):

- `learners(id, name, created_at)`
- `sessions(id, learner_id, topic, started_at, ended_at)`
- `turns(id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)`
- `concepts(id, name, parent_id)`
- `mastery(learner_id, concept_id, score 0-1, attempts, last_seen, updated_at)`
- `mistakes(learner_id, concept_id, pattern, count, last_seen)`
- `signals(session_id, ts, type, value)`

Mastery update: simple Elo-style or Bayesian knowledge tracing; keep it small and documented. Spaced-review suggestion: surface concepts with decayed mastery.

## 9. Behavioral signals (web adapter only)

Collected client-side in the browser, sent with each message. Used **only** to adapt teaching.

| Signal | How | Teaching response |
|---|---|---|
| Large paste (> N chars, no typing) | `paste` event | Teacher asks: "Explain this in your own words" |
| Instant hint request with no attempt | time-to-first-keystroke + hint button | Diagnostician steps rung back; asks for a first attempt |
| Tab switch / blur then fast polished answer | `visibilitychange`, timing | Teacher asks a follow-up "why does this work?" transfer question |
| Typing speed collapse / long idle | keystroke timing | Frustration estimate up; offer smaller question or visual |
| Rapid-fire wrong attempts | attempt timing | Escalate rung |

Rules:
- A single signal never produces an accusation. Language is always neutral and supportive.
- Signals are stored per session, shown to the learner in their own dashboard, and can be disabled with one toggle.
- README includes a "What is tracked and why" privacy section.
- Claude Code adapter has no behavioral signals (terminal cannot provide them); it uses only text-based cues (e.g., long pasted blocks).

## 10. Dashboard (`dashboard/`)

Static HTML generated from SQLite (no server needed); also served by the web adapter.

- Monthly mastery chart per concept/topic
- Streak and sessions per week
- Weak topics list with recommended next practice
- Rung usage over time (are they needing fewer hints? that is the real progress metric)
- Session history with replay of visuals
- Command: `python -m dashboard.build` and `/socratic dashboard` in Claude Code

## 11. Evaluation harness (`eval/`), most important for credibility

Simulated learners (LLM-driven personas):

- `beginner` (knows nothing, vague answers)
- `frustrated` (gives up quickly, emotional)
- `copier` (tries to extract the answer or paste solutions)
- `strong` (fast, needs less scaffolding)

Metrics:

1. **Answer-leak rate**: % of tutor turns that reveal the final answer before the final rung. Judged by an independent LLM judge with the ground truth plus a rule-based check.
2. **Learning gain**: pre-test vs post-test score on the concept, per persona.
3. **Visual vs text-only**: same personas and topics run with visuals disabled vs enabled; compare learning gain.
4. **Escalation quality**: does a stuck learner get unstuck without the tutor dumping the answer early?
5. **Critic value**: leak rate with Critic on vs off.

Deliverables:
- `eval/scenarios/` with at least 10 topics (recursion, binary trees, big-O, pointers, gradient descent, SQL joins, HTTP, etc.) each with ground truth, pre/post quizzes
- `python -m eval.run --all` produces `eval/results/results.md` and JSON
- Results table pasted into the README
- Run with a fixed seed and record model versions for reproducibility

## 12. Adapters

### Claude Code adapter (`adapters/claude_code/`)
- A skill (`SKILL.md`) and slash commands: `/socratic <topic or question>`, `/socratic dashboard`, `/socratic review`
- The skill instructs Claude Code to call the local Python core (CLI: `python -m core.cli ask "..."`) so that Teacher/Critic/ladder logic is enforced in code and not only in prompts
- Also provide `AGENTS.md` so Cursor/Codex-style agents can use the same CLI
- `install.sh` copies the skill into `~/.claude/skills/` (or the project `.claude/`) and sets up the venv

### Web adapter (`adapters/web/`)
- FastAPI backend, simple frontend (vanilla JS or small React/Vite; keep it minimal)
- Chat UI with inline visual rendering (Mermaid, SVG, HTML trace in sandboxed iframe)
- Behavioral signal collector
- Dashboard page
- Run: `python -m adapters.web` then open `localhost:8000`

## 13. Tech stack and repo layout

- Python 3.11+, FastAPI, pydantic, SQLite (`sqlite3` or SQLModel), pytest, ruff
- LLM client in `core/llm.py` with providers: Anthropic (default), Gemini, OpenAI; selected by env var; includes a **mock provider** so tests and CI run without keys
- Config in `.env` (example provided), sensible defaults

```
socratic-tutor/
├── core/
│   ├── agents/ (diagnostician.py, teacher.py, visualizer.py, critic.py, prompts/)
│   ├── orchestrator.py
│   ├── ladder.py
│   ├── learner.py
│   ├── llm.py
│   └── cli.py
├── skills/ (eli5/, diagram/, trace/, analogy/, plot/, registry.py)
├── plugins/ (manim/, three_d/)
├── curriculum/ (concepts, analogies, visual templates)
├── adapters/ (claude_code/, web/)
├── dashboard/
├── storage/ (schema.sql, migrations)
├── eval/ (personas/, scenarios/, run.py, results/)
├── tests/
├── legacy/ (old fehm-ai-engine)
├── docs/ (architecture.md with diagram, privacy.md)
├── install.sh
├── pyproject.toml
├── README.md
└── SPEC.md
```

## 14. Build order (do all of it, in this order)

Each step ends with something that runs and has tests. Commit after each step with a clear message. Update `docs/progress.md` with what is done.

1. **Foundation**: move old code to `legacy/`, set up `pyproject`, `llm.py` with mock + real providers, SQLite schema, CLI skeleton, CI (pytest + ruff).
2. **Core loop**: Teacher + Critic + hint ladder + orchestrator. `python -m core.cli ask` works end to end on the mock and real provider. Test: leak detection on 10 scripted turns.
3. **Diagnostician + learner model**: first-session diagnostic, mastery updates, rung recommendation. Tests for ladder escalation/de-escalation.
4. **Skills v1**: `eli5`, `diagram` (Mermaid blanks), `analogy`, registry, Visualizer agent. Visuals written to `.socratic/visuals/`.
5. **Trace skill**: sandboxed execution tracer + HTML trace viewer + predict/compare flow. Security tests (timeout, infinite loop, file/network access blocked).
6. **Claude Code adapter**: skill, commands, `install.sh`, `AGENTS.md`. Verify `/socratic teach me recursion` works in a fresh clone.
7. **Dashboard**: HTML generation from SQLite, monthly mastery, streaks, weak topics, rung-usage trend.
8. **Eval harness**: personas, scenarios, judge, metrics, results report. Run and record real numbers.
9. **Web adapter**: FastAPI, chat UI, visual rendering, behavioral signals + signal-driven teaching rules, dashboard page, privacy toggle.
10. **Plugins and extra skills**: `plot`, `three_d`, `manim` (optional, documented, disabled by default).
11. **Polish**: README (hero GIF, 30-second quickstart, architecture diagram, eval results table, privacy section, legacy note), `docs/architecture.md`, demo script, final full eval run.

## 15. Definition of done (whole project)

- Fresh clone, `./install.sh`, then `/socratic teach me recursion` works with no extra services
- Web UI runs with one command, shows visuals inline, and records behavioral signals with a toggle
- Four agents implemented, each with tests; Critic is in the loop on every reply
- At least 5 working skills (eli5, diagram, trace, analogy, plot) plus optional manim/3D plugins
- Dashboard shows monthly progress, streaks, weak topics
- `eval/results/results.md` exists with real numbers: leak rate (with/without Critic), learning gain (visual vs text-only) across at least 4 personas and 10 topics
- README has a demo GIF, quickstart, results table, privacy section
- All tests pass in CI without API keys (mock provider)

## 16. Rules for the agent building this

- Implement the design; don't quietly change it. If something is infeasible, write the reason in `docs/decisions.md` and choose the nearest simple alternative.
- Run everything you build. Never mark a step done without executing its tests.
- Never weaken, skip, or delete a test to make it pass.
- Keep core dependencies minimal. Anything heavy goes in `plugins/` as optional.
- Do not invent eval numbers. If a run was not executed, say so.
- Keep code readable and commented where the logic is non-obvious (the owner must be able to explain every module in an interview).
- If blocked after 3 attempts on a task, stop, write the state to `docs/progress.md`, and report honestly.

