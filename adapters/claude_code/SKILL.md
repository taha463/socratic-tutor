---
name: socratic
description: Autonomous Socratic Tutor that never gives the answer directly, combining structured questioning, visual explanations, and an adaptive hint ladder.
---

# Socratic Tutor Skill for Claude Code

When the user asks to learn a topic, understand an algorithm, or debug a concept with the Socratic Tutor (e.g. `/socratic teach me recursion` or `/socratic what is big-O`):

## Command Routing
Always invoke the local Python core CLI directly so that Teacher, Critic, and Hint Ladder pedagogical rules are enforced in deterministic code rather than solely relying on LLM prompts.

1. **Ask a question or continue learning:**
   ```bash
   python -m core.cli ask "<user's message or question>" --topic "<current topic>"
   ```

2. **View mastery dashboard:**
   ```bash
   python -m core.cli dashboard
   ```

3. **Review weak or decayed concepts:**
   ```bash
   python -m core.cli review
   ```

## Handling Output
- Display the tutor's response verbatim to the user.
- If the tutor response contains a visual path (e.g. `[Visual Generated]: file://...`), present a clickable markdown link to the user and encourage them to open it in their browser to inspect the interactive diagram, analogy, or step-by-step execution trace.
- Never summarize or reveal the answer ahead of the tutor's active hint ladder rung.
