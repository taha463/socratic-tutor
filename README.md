# Socratic Tutor v2

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Answer Leak Rate: 0.0%](https://img.shields.io/badge/Answer_Leak_Rate-0.0%25-brightgreen.svg)]()
[![Scaffolding: 7-Rung Ladder](https://img.shields.io/badge/Hint_Scaffolding-7--Rung_Ladder-blueviolet.svg)]()
[![Storage: SQLite Local](https://img.shields.io/badge/Storage-In--Process_SQLite-003B57.svg)]()
[![Privacy: Zero Telemetry](https://img.shields.io/badge/Privacy-100%25_Local_&_Private-success.svg)]()

> **A local-first pedagogical framework that never gives the answer directly.**  
> Combines Socratic dialogue, multimodal visual scaffolds (with blanks), an adaptive hint ladder, and real-time behavioral telemetry to make learners *see* the intuition themselves.

---

```
                       🦉 SOCRATIC TUTOR v2 ARCHITECTURE
  
    [ Claude Code Adapter ]                         [ Modern Web Adapter ]
       (/socratic skill)                               (FastAPI + Web UI)
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │   TUTOR ORCHESTRATOR (Core)   │
                       └───────────────┬───────────────┘
                                       │
     ┌───────────────────┬─────────────┴─────────────┬───────────────────┐
     ▼                   ▼                           ▼                   ▼
┌──────────────┐  ┌──────────────┐            ┌──────────────┐    ┌──────────────┐
│Diagnostician │  │ Hint Ladder  │            │Teacher Agent │    │ Critic Gate  │
│(Affect/Pacing│  │  (7 Rungs)   │            │(One-Question)│    │(Zero Leaks!) │
└──────────────┘  └──────────────┘            └──────┬───────┘    └──────────────┘
                                                     ▼
                                              ┌──────────────┐
                                              │  Visualizer  │
                                              └──────┬───────┘
                                                     ▼
                             ┌───────────────────────────────────────┐
                             │    Multimodal Pedagogical Skills      │
                             │  eli5 · diagram · trace · analogy     │
                             │  plot · three_d (3D) · manim (video)  │
                             └───────────────────────────────────────┘
                                                     │
                                                     ▼
                                        [ Local SQLite Storage ]
                                      (.socratic/ · BKT Mastery)
```

---

## 💡 Why Socratic Tutor v2?

Standard AI tutors act as answer keys. When a student struggles, the AI dumps code and explanations, creating **cognitive offloading**—the learner practices prompting rather than thinking.

**Socratic Tutor v2 reverses this:**
1. **Zero Answer Leaks**: A synchronous Critic gate flags and rewrites any draft that reveals the direct solution prematurely.
2. **Scaffolded Visuals with Blanks**: Visuals never show complete answers; they feature masked blanks (`[???]`) and require learners to predict invariants first.
3. **Predict, Run, Compare**: Learners predict execution states before the sandboxed Python tracer reveals step-by-step memory and stack frames.
4. **Adaptive Hint Ladder**: Complete beginners are never stuck. Scaffolding escalates through 7 pedagogical rungs as needed, and fades as mastery builds.
5. **Private & In-Process**: Runs in under a minute without Docker, Redis, Celery, or MongoDB. Everything persists to a local SQLite database.

---

## ⚡ 30-Second Quickstart

Install and run in a single command:

### macOS / Linux
```bash
git clone https://github.com/taha463/fehm-ai-engine.git socratic-tutor
cd socratic-tutor
./install.sh
```

### Windows (PowerShell)
```powershell
git clone https://github.com/taha463/fehm-ai-engine.git socratic-tutor
cd socratic-tutor
.\install.ps1
```

The installer configures a clean virtual environment, verifies dependencies, initializes the local SQLite database, and links the Claude Code adapter.

---

## 🚪 Dual Doors: Terminal & Web

Socratic Tutor v2 provides one central Python core accessible through two adapters:

### 1. Claude Code Adapter (`adapters/claude_code/`)
Interact natively inside Claude Code or your terminal using the `/socratic` command:
```bash
# Socratic tutoring session
python -m core.cli ask "How do I reverse a linked list?" --topic "linked_list"

# View mastery dashboard
python -m core.cli dashboard

# Review weak or decayed topics
python -m core.cli review
```

### 2. Interactive Web Adapter (`adapters/web/`)
Start the web interface with inline diagrams, interactive execution tracer, and dashboard:
```bash
python -m adapters.web
# Opens on http://localhost:8000
```
- **Chat Interface**: Socratic dialogue with live hint-ladder rung badges (`Rung 1: Probe`, `Rung 4: Visual with Blanks`).
- **Inline Visuals**: Dark-mode Mermaid flowcharts, Matplotlib complexity curves, and Three.js 3D models.
- **Privacy Toggle**: Instant 1-click toggle to disable all behavioral telemetry.
- **Mastery Center**: Embedded live dashboard tracking streak, BKT mastery progression, and hint fading metrics.

---

## 📊 Autonomous Evaluation Benchmark

Every claim is backed by empirical evidence produced by the autonomous evaluation harness (`eval/run.py`). Tested across **10 curriculum topics** and **4 simulated personas** over **120 full interactive sessions**:

| Metric | With System (Standard) | Without System (Ablation) | Measured Impact |
|---|:---:|:---:|:---:|
| **Answer-Leak Rate** | **0.0%** | 8.2% (Critic Off) | **100.0% reduction in solution leaks** |
| **Learning Gain (Pre vs Post)** | **+0.62** | +0.51 (Visuals Off) | **+21.2% higher conceptual retention** |
| **Escalation Unblock Rate** | **100.0%** | - | Complete beginners & frustrated unblocked |

### Learning Gain by Persona
- **Beginner** (knows nothing, vague attempts): **+0.85 gain** (100% final mastery)
- **Frustrated** (high cognitive friction, rapid attempts): **+0.85 gain** (100% final mastery)
- **Copier** (attempts to extract direct code dumps): **+0.64 gain** (79% final mastery)
- **Strong** (autonomous, identifies invariants): **+0.14 gain** (82% final mastery)

*(Detailed topic-by-topic breakdowns are documented in [`eval/results/results.md`](./eval/results/results.md).)*

---

## 🪜 The 7-Rung Hint Ladder (`core/ladder.py`)

When learners need guidance, the tutor steps up the ladder without leaking answers:

```
Rung 7: Full Explanation + Transfer Check ──► (Reveals concept, immediately tests comprehension)
Rung 6: Partial Reveal                    ──► (Reveals the key step, asks learner to finish)
Rung 5: Worked Example                    ──► (Solves an isomorphic problem completely)
Rung 4: Visual with Blanks                ──► (Mermaid diagram, trace, or plot with [???])
Rung 3: Analogy / ELI5                    ──► (Real-world analogy with mapping challenge)
Rung 2: Narrow Question                   ──► (Concrete, highly focused sub-question)
Rung 1: Probe                             ──► (Elicits learner's existing thoughts or attempts)
```

- **Escalation Trigger**: 2 consecutive failures, Diagnostician frustration estimate $> 0.7$, or $> 3$ turns on a rung.
- **Scaffolding Fading**: Ladder steps down after successes, ensuring the learner achieves independent mastery.

---

## 🎨 Multimodal Pedagogical Skills (`skills/`)

| Skill | Modality | Output | Purpose |
|---|---|---|---|
| `eli5` | Analogy | Card + Mapping Challenge | Translates abstract concepts into physical everyday models. |
| `diagram` | Flow/Tree | Dark Mermaid SVG (with Blanks) | Structural data structures (BST, graphs, queues). |
| `trace` | Code Execution | Sandboxed Step-by-Step HTML | Interactive call stack & variables viewer with predict-first flow. |
| `analogy` | Mental Models | Curriculum Analogy Card | Curated analogies with transfer questions. |
| `plot` | Math & Algorithms | Matplotlib Dark-Mode SVG | Complexity growth curves ($O(n \log n)$) & gradient descent paths. |
| `three_d` *(plugin)* | Spatial / 3D | Three.js WebGL Interactive Page | 3D coordinate frames, matrix transforms, hyperplanes. |
| `manim` *(plugin)* | Animation | Manim Video / Storyboard | Deep-dive animations with graceful zero-crash fallback. |

---

## 🛡️ Privacy & Behavioral Telemetry

Socratic Tutor v2 adheres to an **"Adapt, Don't Police"** privacy model:

- **100% Local**: All session data, mastery scores, and telemetry signals are stored in your local SQLite database (`.socratic/tutor.db`). No cloud telemetry.
- **Non-Punitive Signals**: Client-side signals (paste detection, idle friction, tab switching, rapid attempts) are used **strictly** to adapt hint pace and detect frustration. They never accuse or penalize.
- **Single-Click Opt-Out**: Telemetry can be paused instantly via the UI toggle or by using the terminal CLI (which collects zero client telemetry).

Read our full [Privacy Policy](./docs/privacy.md) for details.

---

## 🏛️ Evolution from v1 FEHM.AI

This repository is a ground-up v2 evolution of the original `fehm-ai-engine`:
- **v1 Architecture**: Centralized, distributed infrastructure requiring Docker Compose, Celery workers, Redis message brokers, and MongoDB Atlas.
- **v2 Architecture**: In-process, lightweight, local-first Python + SQLite architecture runnable in under a minute with zero external service dependencies.
- **Preserved Git History**: The entire v1 implementation is archived in [`legacy/`](./legacy/) with complete documentation and original commits preserved.

---

## 🧪 Verification & Testing

Every code change must pass all unit, integration, and security tests:

```bash
# Run 82 unit and integration tests
python -m pytest

# Run linting and static analysis (0 errors)
python -m ruff check .

# Run autonomous evaluation matrix
python -m eval.run --all

# Run interactive demonstration script
python demo.py
```

---

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.
