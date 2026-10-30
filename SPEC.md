# Socratic Tutor v2: Full Project Spec (Clone-and-Run Web App)

> Hand this file to a coding agent (Claude Code). Read all of it, then build the whole system in the order in section 15. Work autonomously: one task at a time, run what you build, commit after each task, no placeholders, no fake-green.

---

## 1. Vision

A Socratic tutor web app that **never hands over the answer directly** but still makes the learner *see* the idea. It combines:

- Socratic questioning (core behavior), enforced in code, not only in prompts
- Rich visual explanations: diagrams with blanks, ELI5, analogies, code execution traces, plots, 3D, step animations
- A hint ladder so complete beginners are never stuck in a loop
- Four cooperating agents with distinct jobs
- Behavioral signals (typing, paste, tab switching) used to adapt teaching, never to punish
- A progress dashboard (monthly mastery, streaks, weak topics)
- An evaluation harness with simulated students that produces real numbers

### The only setup the user does

```
git clone <repo> && cd socratic-tutor
cp .env.example .env      # paste an API key (or choose local Ollama, no key)
npm install
npm run dev               # open http://localhost:3000
```

Nothing else. No Docker, no Redis, no Celery, no MongoDB, no Python install, no separate services. Everything runs locally on the user's machine and data stays local.

This repo evolves the old `fehm-ai-engine` (Celery/Redis/Mongo/FastAPI). Move the old code to `legacy/` with git history kept, and say so in the README.

## 2. Scope decisions (final)

- **One stack: TypeScript + Next.js** (App Router). One language for UI, API, agents, eval.
- **One door: the web app.** No MCP server, no Claude Code skill, no CLI-agent adapters.
- **One command to run:** `npm run dev`. Also `npm run build && npm start` for production-style local run.
- **Storage:** local SQLite file under `data/`. Pick a driver that installs with plain `npm install` and no compiler (e.g. `@libsql/client` in file mode, or Node's built-in `node:sqlite` if the supported Node version allows). Document the choice in `docs/decisions.md`.
- **Models:** provider chosen in `.env`: Anthropic, OpenAI, Gemini, or **Ollama** (local, free, no key). Plus a **mock provider** so tests and CI run with no key.
- **Code execution for tracing:** Python via **Pyodide in a Web Worker** (runs in the browser, isolated from the server, no server-side code execution) and JavaScript via a sandboxed Worker.
- **Manim:** cannot run in a browser and needs heavy installs, so it is NOT core. Core has a built-in **step-animation player** (Manim-style: animated, step by step, driven by JSON scenes). Real Manim is an optional plugin, off by default, documented only.

## 3. Design principles

1. **Show structure, hide the answer.** Visuals contain blanks, predictions, or partial states; the learner fills them in.
2. **Predict, run, compare.** For code and processes: learner predicts first, then sees the real trace.
3. **Never leave a learner stuck.** Escalate through the hint ladder; final rungs reveal progressively more, always with explanation and a follow-up check.
4. **Adapt, don't police.** Signals change teaching strategy. Never block, accuse, or shame.
5. **Hard enforcement.** The Critic gates every reply in code. A reply that leaks the answer cannot reach the learner.
6. **Local and private.** No telemetry. README states exactly what is tracked.
7. **Measurable.** Every claim is backed by the eval harness.

## 4. Non-goals

- Not a proctoring tool: no webcam, no screen recording, no blocking.
- Not a general chatbot. Teaching sessions only.
- No hosted multi-user service in v2 (single local user; learner profiles are local).

## 5. Architecture

```
Browser (Next.js UI)
  ├─ Chat UI + visual renderer (Mermaid, SVG, HTML, Three.js, step-animation player)
  ├─ Pyodide/JS Workers (code trace sandbox)
  ├─ Behavior signal collector
  └─ Dashboard pages
        │  HTTP / streaming
Next.js API routes
  └─ core/ (pure TypeScript, no framework imports)
       ├─ orchestrator
       ├─ agents: diagnostician, teacher, visualizer, critic
       ├─ ladder, learner model, skills registry
       └─ llm client (anthropic | openai | gemini | ollama | mock)
        │
   SQLite (data/tutor.db)
```

`core/` must be framework-independent so `eval/` can import it directly.

### Turn flow (every learner message)

1. UI sends `{sessionId, message, signals}` to `/api/turn`.
2. **Diagnostician** reads message + signals + learner model and outputs: `level`, `frustration` (0 to 1), `state` (LEARNING, STUCK, MASTERY, COPYING_SUSPECTED), `recommendedRung`.
3. **Teacher** drafts a reply for that rung; may request a visual.
4. **Visualizer** picks the best skill for this concept and returns a visual spec (with blanks/predictions unless on the final rungs).
5. **Critic** reviews text and visual: leak? more than one question? tone vs frustration? visual correct and hiding what it should? On failure it returns rewrite instructions; Teacher rewrites (max 2), then the reply is sent. Every verdict is logged.
6. Orchestrator updates learner model, stores the turn, streams the reply and visual to the UI.

## 6. Agents

Each agent = a prompt file in `core/agents/prompts/` + a TypeScript module. Outputs are validated with **zod** schemas; invalid output triggers one retry.

| Agent | Input | Output | Rules |
|---|---|---|---|
| **Diagnostician** | message, signals, history, learner model | level, frustration, state, recommendedRung, reasoning | Runs every turn, cheap. First session runs a 3-question diagnostic. |
| **Teacher** | diagnosis, topic, history, learner model | reply text, optional visual request | One question per reply. No code dumps. No direct final answer before the final rung. Warm tone, adapts to frustration. |
| **Visualizer** | concept, level, what must stay hidden | chosen skill + visual spec | Chooses among skills (section 7). Visuals must contain a blank/prediction unless on final rungs. |
| **Critic** | draft reply, visual spec, ground truth (if known) | pass/fail, issues, rewrite instructions | Checks leak (rule-based + LLM judge), single-question rule, tone, visual correctness. Logs every verdict. |

The old Librarian becomes `curriculum/`: concepts, tested analogies, visual templates as JSON/markdown, read by Teacher and Visualizer.

## 7. Hint ladder (`core/ladder.ts`)

1. **Probe**: ask what the learner thinks or tried.
2. **Narrow question**: smaller, more concrete.
3. **Analogy / ELI5**: everyday analogy, then ask them to map it back.
4. **Visual with blanks**: diagram or trace with missing pieces.
5. **Worked example of a similar problem**: solve a different problem fully, then ask them to apply it.
6. **Partial reveal**: reveal the key step with explanation; they finish it.
7. **Full explanation + transfer check**: only after repeated failure; immediately ask a transfer question.

Rules: start at the Diagnostician's rung (complete beginners may start at 3 or 4); escalate after N failed attempts (default 2, configurable) or frustration > 0.7; fade scaffolding after successes; never stay on one rung more than 3 turns.

## 8. Visual skills (`skills/`)

Each skill: folder with `skill.md` (when to use, inputs, outputs, examples), a `render` function producing a **visual spec** (JSON), and a React renderer component. Registry in `skills/registry.ts`. All visuals render **inline in the chat**.

| Skill | Use for | Output | Tier |
|---|---|---|---|
| `eli5` | Any concept | Short analogy + a mapping question | core |
| `diagram` | Flows, hierarchies, data structures, architectures | Mermaid or SVG with blank nodes the learner can fill | core |
| `trace` | Code questions | Pyodide/JS Worker runs code with a step tracer; UI shows call stack, variables, line highlight. Learner predicts first, then reveals. | core |
| `analogy` | Abstract concepts | Picks from `curriculum/` or generates one | core |
| `plot` | Math, ML, complexity | Charts via a lightweight chart lib or SVG (gradient descent steps, Big-O curves) | core |
| `animate` | Processes over time (sorting, recursion unfolding, backprop, packet flow) | JSON scene played by a built-in step-animation player (play, pause, step, scrub); Manim-style but runs in the browser | core |
| `three_d` | Spatial concepts (matrices, transforms, geometry) | Three.js scene | core, lazy-loaded |
| `manim` | Polished video deep dives | Rendered video | optional plugin, off by default, needs local ffmpeg/Cairo/LaTeX |

Requirements:
- Sandboxed rendering: HTML visuals in sandboxed iframes; validate every visual spec against a zod schema before rendering.
- Trace sandbox: Worker with hard timeout (5s), step limit, no network, output size cap. Server never executes learner code.
- Every skill has unit tests; renderers have smoke tests.

## 9. Learner model (SQLite)

Tables (minimum):

- `learners(id, name, created_at)`
- `sessions(id, learner_id, topic, started_at, ended_at)`
- `turns(id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)`
- `concepts(id, name, parent_id)`
- `mastery(learner_id, concept_id, score, attempts, last_seen, updated_at)`
- `mistakes(learner_id, concept_id, pattern, count, last_seen)`
- `signals(session_id, ts, type, value)`

Mastery update: simple Elo-style or Bayesian knowledge tracing, small and documented. Surface decayed concepts for spaced review. Use migrations; DB file auto-created on first run (no manual setup step).

## 10. Behavioral signals (browser)

Collected client-side, sent with each message, used **only** to adapt teaching.

| Signal | How | Teaching response |
|---|---|---|
| Large paste with little typing | `paste` event + keystroke count | Teacher asks "explain this in your own words" |
| Instant hint request with no attempt | time-to-first-keystroke + hint button | Rung steps back; ask for a first attempt |
| Tab switch then fast polished answer | `visibilitychange`, timing | Follow-up "why does this work?" transfer question |
| Typing speed collapse / long idle | keystroke timing | Frustration estimate up; offer smaller question or visual |
| Rapid wrong attempts | attempt timing | Escalate rung |

Rules: one signal never causes an accusation; language is always neutral and supportive; signals are visible to the learner in their own dashboard; one settings toggle disables all collection; README has a "What is tracked and why" section.

## 11. Dashboard (`/dashboard`)

- Monthly mastery chart per topic
- Streaks and sessions per week
- Weak topics with recommended next practice
- Rung-usage trend (needing fewer hints over time is the real progress metric)
- Session history with replay of visuals
- Export progress as JSON

## 12. Evaluation harness (`eval/`), most important for credibility

Simulated learners (LLM personas): `beginner`, `frustrated`, `copier` (tries to extract answers or paste solutions), `strong`.

Metrics:
1. **Answer-leak rate**: % of tutor turns revealing the final answer before the final rung (independent LLM judge + rule-based check against ground truth).
2. **Learning gain**: pre-test vs post-test per persona.
3. **Visual vs text-only**: same personas and topics with visuals off vs on.
4. **Escalation quality**: stuck learners get unstuck without early answer dumps.
5. **Critic value**: leak rate with Critic on vs off.

Deliverables: `eval/scenarios/` with at least 10 topics (recursion, binary trees, Big-O, pointers, gradient descent, SQL joins, HTTP, etc.) each with ground truth and pre/post quizzes; `npm run eval` writes `eval/results/results.md` + JSON; results table in the README; fixed seeds and recorded model versions. Eval must support Ollama so anyone can reproduce it for free.

## 13. UI requirements

- Clean chat layout; visuals inline; collapsible "thinking strategy" panel (current rung, state, frustration) so learners and reviewers see the pedagogy.
- Topic picker + free-form question box; "I'm stuck" button (a deliberate escalation, distinct from the instant-hint signal).
- Light/dark mode, responsive, keyboard accessible.
- First-run screen: detects missing API key and shows exactly what to put in `.env` (or how to select Ollama), with a connection test button.
- No login, no accounts.

## 14. Tech stack and repo layout

- Node 20+, TypeScript, Next.js (App Router), zod, Vitest, Playwright (a few e2e tests), ESLint/Prettier
- Mermaid, Three.js, a small chart lib, Pyodide (loaded in a Worker, lazy)
- Config via `.env` (`.env.example` provided with comments for each provider)

```
socratic-tutor/
├── app/                # Next.js routes: /, /session/[id], /dashboard, /settings, /api/*
├── components/         # chat, visual renderers, dashboard widgets
├── core/
│   ├── agents/ (diagnostician.ts, teacher.ts, visualizer.ts, critic.ts, prompts/)
│   ├── orchestrator.ts
│   ├── ladder.ts
│   ├── learner.ts
│   └── llm/ (anthropic.ts, openai.ts, gemini.ts, ollama.ts, mock.ts)
├── skills/             # eli5, diagram, trace, analogy, plot, animate, three_d, registry.ts
├── plugins/manim/      # optional, off by default
├── curriculum/         # concepts, analogies, visual templates
├── workers/            # pyodide + js trace sandboxes
├── storage/            # schema + migrations
├── eval/               # personas, scenarios, run.ts, results/
├── tests/
├── legacy/             # old fehm-ai-engine
├── docs/               # architecture.md, privacy.md, decisions.md, progress.md
├── .env.example
├── package.json
├── README.md
└── SPEC.md
```

## 15. Build order (do all of it, in order)

Each step ends with something that runs and has tests. Commit after each step with a clear message. Keep `docs/progress.md` updated.

1. **Foundation**: move old code to `legacy/`, scaffold Next.js + TS, `.env.example`, LLM clients (including mock and Ollama), SQLite schema + migrations, lint/test/CI. `npm install && npm run dev` must already boot.
2. **Core loop**: Teacher + Critic + hint ladder + orchestrator, minimal chat UI with streaming. Test: leak detection on 10 scripted turns.
3. **Diagnostician + learner model**: first-session diagnostic, mastery updates, rung recommendation. Ladder escalation/de-escalation tests.
4. **Skills v1**: `eli5`, `diagram` (Mermaid blanks), `analogy`, registry, Visualizer agent, inline rendering with schema validation.
5. **Trace skill**: Pyodide/JS Worker tracer, trace viewer, predict-then-reveal flow. Security tests (infinite loop, huge output, network/file access).
6. **Dashboard**: monthly mastery, streaks, weak topics, rung trend, session replay.
7. **Behavior signals**: collectors, signal-driven teaching rules, learner-visible log, privacy toggle.
8. **More skills**: `plot`, `animate` (step-animation player), `three_d`.
9. **Eval harness**: personas, scenarios, judge, metrics, report. Run it and record real numbers.
10. **First-run experience and polish**: missing-key screen, connection test, "I'm stuck" button, thinking-strategy panel, accessibility pass.
11. **Docs and demo**: README (hero GIF, 30-second quickstart, architecture diagram, eval results table, privacy section, legacy note), `docs/architecture.md`, optional `plugins/manim/` documentation, final full eval run.

## 16. Definition of done

- Fresh clone, copy `.env.example` to `.env`, add a key (or select Ollama), `npm install`, `npm run dev` gives a working tutor with no other setup
- All four agents implemented and tested; Critic gates every reply
- At least 6 working visual skills (eli5, diagram, trace, analogy, plot, animate), plus three_d
- Code tracing runs entirely in the browser Worker; the server executes no learner code
- Behavior signals work with a visible log and an off switch
- Dashboard shows monthly progress, streaks, weak topics
- `eval/results/results.md` exists with real numbers (leak rate with and without Critic, learning gain visual vs text-only) across at least 4 personas and 10 topics
- README has a demo GIF, quickstart, results table, privacy section
- All tests pass in CI with the mock provider and no API keys

## 17. Rules for the agent building this

- Implement the design; do not quietly change it. If something is infeasible, record why in `docs/decisions.md` and pick the nearest simple alternative.
- Run everything you build. Never mark a step done without executing its tests.
- Never weaken, skip, or delete a test to make it pass.
- Keep dependencies lean; heavy things are lazy-loaded or optional plugins.
- Do not invent eval numbers. If a run was not executed, say so.
- Keep code readable and commented where the logic is non-obvious; the owner must be able to explain every module in an interview.
- If blocked after 3 attempts on a task, stop, write the state to `docs/progress.md`, and report honestly.
