# Privacy & Behavioral Telemetry Policy

**Socratic Tutor v2 is local-first, completely private, and non-punitive by design.**

We do not use surveillance software, webcams, keyloggers, screen recording, or proctoring mechanisms. All learner data remains strictly on your local machine in `data/tutor.db`.

---

## 1. Core Privacy Invariants

1. **100% Local-First Storage**: All learner profiles, session dialogues, concept mastery scores, and telemetry signals are persisted in a local SQLite file (`data/tutor.db`). No information is ever dispatched to external servers, cloud storage, or telemetry collectors.
2. **Zero Third-Party Trackers**: No Google Analytics, no PostHog, no tracking pixels, and no advertising cookies exist in the codebase.
3. **Adapt, Never Police**: Behavioral telemetry signals are utilized exclusively by the Diagnostician and Hint Ladder to adapt teaching pacing and reduce cognitive overload. They are **never** used to accuse, penalize, or shame learners.
4. **Instant Single-Click Opt-Out**: Learners can disarm client-side telemetry collection with a single click in the workspace header.

---

## 2. Complete SQLite Storage Audit

Every piece of data stored in `data/tutor.db` is strictly bounded and inspectable:

| Table Name | Description | Stored Attributes | Sensitive Data? |
|---|---|---|---|
| `learners` | Local user profile | Random UUID, username, creation timestamp | None (local pseudonym) |
| `sessions` | Active learning dialogues | Session ID, topic, active ladder rung, timestamps | None |
| `turns` | Message history & artifacts | Turn ID, role (user/assistant), message text, JSON visual payload, Critic verdict | None |
| `mastery` | Knowledge tracking state | Concept name, BKT $P(L)$ probability score, practice count, timestamp | None |
| `mistakes` | Recurring misconceptions | Error category, misconception description, resolution flag | None |
| `signals` | Lightweight pacing signals | Turn ID, signal type (`paste`, `idle`, `blur`, `wpm`), signal value | None |

---

## 3. What Telemetry Is Collected & Why

The workspace collects lightweight client-side behavioral signals during active tutoring sessions:

| Signal | How Collected | Why Tracked (Pedagogical Response) |
|---|---|---|
| **Large Paste Event** | Browser `paste` event length (`event.clipboardData.getData().length`) | Detects when a learner pastes a full external code solution. The Teacher responds warmly: *"Can you explain what this snippet does in your own words?"* **(Note: The clipboard content itself is never stored or transmitted, only the character count)**. |
| **Idle Duration** | Time elapsed since last keystroke or message submission | Detects cognitive freeze or confusion. Diagnostician boosts frustration estimate and offers a visual scaffold or smaller question. |
| **Tab Switch / Blur** | Browser `visibilitychange` elapsed time | Detects when a learner switches tabs to research a concept. The Teacher poses a transfer question (*"Why does this step work?"*) to solidify understanding. |
| **Rapid-Fire Attempts** | Submission frequency ($< 3$ seconds) | Detects frantic trial-and-error. The system escalates the hint ladder to unblock the learner. |
| **"I'm Stuck" Rescue Button** | Direct click on Composer rescue button | Learner requests immediate escalation along the hint ladder. |

### What Is NEVER Collected
- **NO Keystroke Logging**: Individual keystrokes or typed characters are never recorded.
- **NO Webcam or Microphone**: Zero media capture devices are accessed.
- **NO Screen Recording**: Zero screen capture APIs or canvas grabbers are used.
- **NO Clipboard Reading**: The content of your clipboard is never inspected or logged.
- **NO Browser History**: Zero browsing history or tabs outside the session are monitored.

---

## 4. Disabling Behavioral Telemetry

### Client-Side Toggle
In the session workspace header (`/session/[id]`), click the **🛡️ Telemetry: Active** pill.
- When set to **🔒 Telemetry: Disabled**, the client-side JavaScript collector is completely disarmed.
- All subsequent chat requests send strictly `{}` for signals.
- The tutor functions seamlessly using purely text-based diagnostic reasoning.

---

## 5. Inspecting or Deleting Your Data

Because all data resides in a standard local SQLite file, you maintain total data sovereignty:

- **View in App**: Navigate to `/dashboard` to view mastery trends, streak heatmaps, and weak topics.
- **Inspect via SQLite**:
  ```bash
  sqlite3 data/tutor.db "SELECT topic, concept, p_mastery FROM mastery;"
  sqlite3 data/tutor.db "SELECT * FROM turns ORDER BY created_at DESC LIMIT 10;"
  ```
- **Instant Full Reset**:
  To erase all stored profiles, sessions, and telemetry, delete the `data/` folder:
  ```bash
  rm -rf data/
  ```
  On next run, `storage/db.ts` will automatically initialize a fresh, empty SQLite database.
