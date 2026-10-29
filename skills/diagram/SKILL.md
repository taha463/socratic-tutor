---
name: diagram
description: Render interactive Mermaid diagrams with blank nodes requiring active learner completion.
---

# Diagram Skill

## When to Use
- Flows, hierarchies, tree structures, call stacks, architectures, and state machines (Rung 4)
- Learner needs to visualize spatial or organizational relationships between nodes

## Inputs
- `concept` (str): Topic name
- `mermaid_source` (str): Mermaid syntax containing at least one `?BLANK?` node
- `prompt` (str): Question prompting the learner to fill the blank
- `blanks` (List[str]): Identifiers of missing nodes

## Outputs
- Self-contained HTML page loading Mermaid.js with dark-mode styling and prediction card
