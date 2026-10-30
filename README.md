# Socratic Tutor v2 — Clone-and-Run Web App

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15_App_Router-black.svg)](https://nextjs.org/)
[![Storage: SQLite Local](https://img.shields.io/badge/Storage-node:sqlite_Local-003B57.svg)]()
[![Answer Leak Rate: 0.0%](https://img.shields.io/badge/Answer_Leak_Rate-0.0%25-brightgreen.svg)]()
[![Design: Hallmark Modern--Minimal](https://img.shields.io/badge/Design-Hallmark_Coral-E8725A.svg)]()
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25_Local_&_Private-success.svg)]()

> **A local-first pedagogical web application that never hands you the answer directly, but makes you see the idea.**  
> Built with Next.js App Router, TypeScript, and Node 24 native SQLite. Features Socratic questioning enforced in code, visual scaffolds with blanks, a 7-rung hint ladder, client-side code tracing in Web Workers, and real-time behavioral telemetry that adapts without policing.

---

## 🎨 Interface Preview (Hallmark Modern-Minimal Coral)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🔴 Socratic Tutor              Today   Progress   Sessions                [ Session active ]  │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  Recursion                                                                    [Change topic]   │
│  The tutor asks, you answer. It only shows you the answer when you have tried.                 │
│                                                                                                │
│  ┌──────────────────────────────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │                                                  │  │ How the tutor is helping            │ │
│  │  [Learner]: I don't get how fact(3) ends up as 6.│  │                                     │ │
│  │                                                  │  │ Help ladder                         │ │
│  │  [Tutor]: Let's watch it unfold. What does       │  │  1. Probe                           │ │
│  │  fact(1) hand back?                              │  │  2. Narrow question                 │ │
│  │                                                  │  │  3. Analogy                         │ │
│  │  ┌─── Call stack for fact(3) ──────────────────┐ │  │  4. Visual with blanks [You are here]│ │
│  │  │ fact(3)  waits for fact(2)           n = 3  │ │  │  5. Worked example                  │ │
│  │  │   ▼                                         │ │  │  6. Partial reveal                  │ │
│  │  │ fact(2)  waits for fact(1)           n = 2  │ │  │  7. Full explanation + check        │ │
│  │  │   ▼                                         │ │  ├─────────────────────────────────────┤ │
│  │  │ fact(1)  returns [ ? ]               n = 1  │ │  │ How you are doing: Learning         │ │
│  │  │                                             │ │  │ Frustration: [====        ] 0.3     │ │
│  │  │ Prediction: [ 1 ]  [Check] [Reveal trace]   │ │  ├─────────────────────────────────────┤ │
│  │  └─────────────────────────────────────────────┘ │  │ What the tutor noticed:             │ │
│  │                                                  │  │ • You typed for 14s before sending. │ │
│  │  ┌─── Your Answer ─────────────────────────────┐ │  │ • No tab switches in this session.  │ │
│  │  │ 1? Because n is 1 so it terminates?         │ │  │ • No large pastes.                  │ │
│  │  └─────────────────────────────────────────────┘ │  │                                     │ │
│  │  [I'm stuck]                            [Send]   │  │ [✓] Let the tutor use these signals │ │
│  └──────────────────────────────────────────────────┘  └─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 30-Second Quickstart

Runs entirely on your machine. **No Docker, no Redis, no Celery, no MongoDB, no separate backend.**

```bash
# 1. Clone the repository
git clone https://github.com/taha463/fehm-ai-engine.git socratic-tutor
cd socratic-tutor

# 2. Setup environment (paste an API key, or choose local Ollama for zero keys)
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the web app
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🏛️ System Architecture

```
                           🌐 NEXT.JS APP ROUTER (Single Stack)
    ┌────────────────────────────────────────────────────────────────────────┐
    │  Web App UI (Hallmark Coral Theme)                                     │
    │  • Landing Page (/)               • Workspace (/session/[id])          │
    │  • Progress Dashboard (/dashboard)• Visuals (Diagrams, Trace, Curves)  │
    └───────────────────────────────────┬────────────────────────────────────┘
                                        │ (JSON API)
                                        ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │  API Layer (/api/turn, /api/session/[id], /api/dashboard, /api/setup)  │
    └───────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │  TUTOR ORCHESTRATOR (TypeScript Core)                                  │
    │                                                                        │
    │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐ │
    │  │Diagnostician │   │Teacher Agent │   │ Critic Gate  │   │Visualizer│ │
    │  │(Friction/BKT)│──►│(One-Question)│──►│ (Zero Leaks!)│──►│(Blanks)  │ │
    │  └──────────────┘   └──────────────┘   └──────────────┘   └──────────┘ │
    │                                                                        │
    │  ┌───────────────────────┐             ┌─────────────────────────────┐ │
    │  │ Hint Ladder (7 Rungs) │             │ Local Storage (node:sqlite) │ │
    │  │ Probe ──► Reveal+Check│             │ data/tutor.db (BKT Mastery) │ │
    │  └───────────────────────┘             └─────────────────────────────┘ │
    └───────────────────────────────────┬────────────────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
             ┌───────────────────────┐    ┌────────────────────────┐
             │ Multi-Provider LLMs   │    │ Browser Web Workers    │
             │ Anthropic · OpenAI    │    │ Pyodide (Python)       │
             │ Gemini · Ollama · Mock│    │ Sandboxed JS (5s max)  │
             └───────────────────────┘    └────────────────────────┘
```

---

## 💡 Key Design Decisions

1. **One Stack, TypeScript + Next.js**: Single language across frontend, API routes, multi-agent orchestration, and autonomous evaluation harness.
2. **Synchronous Critic Gate**: Draft responses are strictly inspected before leaving the engine. If the teacher drafts code dumps, answers, or multiple questions, the Critic demands targeted rewrites (bounded to 2 iterations).
3. **Show Structure, Hide the Answer**: Visual cards (call stack traces, Mermaid diagrams, complexity plots) always feature interactive blanks (`?`) requiring learner predictions before reveal.
4. **Zero Server-Side Code Execution**: Code execution for tracing runs **entirely in browser Web Workers** (Pyodide for Python, sandboxed Web Worker for JS with a 5-second CPU limit). The server never executes learner code.
5. **Node 24 Native SQLite (`DatabaseSync`)**: Zero C++ compilation (`node-gyp`), zero external database servers, and zero configuration. Everything saves to `data/tutor.db`.

---

## 📊 Autonomous Evaluation Benchmark

Run autonomously across **10 scenarios** and **4 student personas** (40 sessions, 120 interactive turns):

```bash
npm run eval
```

### Empirical Results Summary

| Metric | With System (Critic Gate + Visuals) | Baseline Ablation (Critic OFF / Text-Only) | Measured Delta |
| :--- | :---: | :---: | :---: |
| **Answer Leak Rate** (Below Rung 7) | **0.0%** | **50.0%** | **-50.0% leaks** |
| **Normalized Learning Gain ($g$)** | **0.83** | **0.61** | **+0.22 gain** |
| **Ladder Adherence Rate** | **100.0%** | 62.0% | +38.0% |
| **Frustration Resolution Rate** | **100.0%** | 58.0% | +42.0% |

*(Full per-scenario data recorded in [`eval/results/results.md`](./eval/results/results.md) and [`eval/results/results.json`](./eval/results/results.json).)*

---

## 🪜 The 7-Rung Hint Ladder

1. **Rung 1: Probe** — Elicits what the learner already thinks or has tried.
2. **Rung 2: Narrow Question** — Breaks problem into a smaller, concrete sub-question.
3. **Rung 3: Analogy** — Real-world analogy with a mapping challenge.
4. **Rung 4: Visual with Blanks** — Diagram, trace, or plot with missing elements to predict.
5. **Rung 5: Worked Example** — Solves an isomorphic problem completely, then asks to apply it.
6. **Rung 6: Partial Reveal** — Reveals the key step with explanation; asks learner to finish.
7. **Rung 7: Full Explanation + Transfer Check** — Explains concept directly, followed immediately by a transfer comprehension check.

---

## 🛡️ Privacy & Behavioral Telemetry

- **Data Ownership**: All conversation history, BKT mastery scores, and telemetry signals are saved locally in `data/tutor.db`.
- **Adapt, Never Police**: Signals (typing duration, paste length, tab switching, idle pauses) are used only to detect confusion and adjust hint pace. They never shame, penalize, or block.
- **Instant Opt-Out**: Telemetry can be toggled off at any moment in the workspace sidebar.
- **LLM Privacy**: Only conversational turns and necessary pedagogical context are sent to your chosen LLM provider. No personal telemetry leaves your machine.

Read the full [Privacy Audit](./docs/privacy.md) for table schemas and retention policies.

---

## 🏛️ Evolution from v1 FEHM.AI

This project evolves the original `fehm-ai-engine`:
- **v1 Stack**: Python, Celery workers, Redis queues, MongoDB Atlas, FastAPI, and Docker.
- **v2 Stack**: Local-first TypeScript, Next.js App Router, and Node 24 SQLite (`node:sqlite`).
- **Legacy Code**: The original v1 engine and Python prototype are preserved in [`legacy/`](./legacy/) with complete git history.

---

## 🧪 Testing & Quality Gates

Run the comprehensive test suite (all unit tests, leak detection, and sandboxed execution tests run in under 2 seconds with zero external API keys):

```bash
# Run unit & integration tests (35 tests, 8 suites)
npm test

# Run type check
npx tsc --noEmit

# Run autonomous evaluation harness
npm run eval

# Run production build
npm run build
```

---

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.
