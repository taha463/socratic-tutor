# Privacy and Behavioral Telemetry Policy

**Socratic Tutor v2 is local-first, private, and non-punitive by design.**

We do not use surveillance software, webcams, browser locking, or proctoring tooling. Learner data never leaves your local machine.

---

## 1. Core Privacy Invariants

1. **Local-First Storage**: All learner profiles, session transcripts, concept mastery scores, and telemetry signals are saved in a local SQLite file (`.socratic/tutor.db` or your configured path). No data is sent to external servers or telemetry collectors.
2. **No Third-Party Analytics**: No Google Analytics, no PostHog, no cookies, and no tracking pixels are embedded in the application.
3. **Adapt, Don't Police**: Telemetry signals are used solely to adapt the teaching pace and hint ladder. They are **never** used to accuse, punish, shame, or penalize learners.
4. **Single-Click Opt-Out**: You can disable all behavioral telemetry with a single click at any time.

---

## 2. What Is Tracked and Why

The Web Adapter collects lightweight client-side behavioral signals only during active tutoring sessions:

| Signal | How Collected | Why Tracked (Pedagogical Response) |
|---|---|---|
| **Large Paste Event** | Browser `paste` event character length | Detects when a learner pastes external solutions. The Teacher responds warmly: *"Can you explain what this snippet does in your own words?"* |
| **Idle Duration** | Time elapsed since last keystroke or message | Detects cognitive friction or when a learner is stuck staring at a blank screen. The Diagnostician boosts frustration estimate and offers a visual scaffold or smaller question. |
| **Tab Switch / Blur** | Browser `visibilitychange` duration | Detects when a learner switched tabs to research a concept. The Teacher poses a transfer question (*"Why does this step work?"*) to reinforce understanding. |
| **Rapid-Fire Attempts** | Submission frequency ($< 3$ seconds) | Detects frantic trial-and-error. The system escalates the hint ladder to unblock the learner. |
| **Instant Hint Request** | Hint button clicked with empty textarea | Encourages the learner to attempt a first prediction before requesting hints. |

---

## 3. Disabling Behavioral Telemetry

### Web Adapter
Click the **🛡️ Telemetry: Active** toggle in the top-right header of the web interface.
- When toggled to **🔒 Telemetry: Disabled**, the client-side JavaScript collector is completely disarmed.
- All subsequent chat requests send strictly `{}` for signals.

### Claude Code Adapter
The Claude Code CLI adapter (`/socratic` or `python -m core.cli ask`) **never** collects behavioral signals. Because it runs directly in your terminal, it operates solely on the explicit text messages you provide.

---

## 4. Inspecting or Deleting Your Data

Because all data resides in a local SQLite file, you have complete ownership and control:

- **View Your History**: Run `python -m core.cli dashboard` or inspect `.socratic/dashboard.html`.
- **Export Raw Data**: Use any SQLite tool (e.g. `sqlite3 .socratic/tutor.db "SELECT * FROM turns;"`).
- **Complete Erasure**: To erase all history, simply delete the `.socratic/` folder:
  ```bash
  rm -rf .socratic/
  ```

