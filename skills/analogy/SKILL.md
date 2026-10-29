---
name: analogy
description: Provide grounded real-world analogies drawn from curriculum or generated dynamically.
---

# Analogy Skill

## When to Use
- Bridging unfamiliar technical abstractions to intuitive real-world experiences (Rung 3)
- When a learner struggles with "why" a particular structure or algorithm is needed

## Inputs
- `concept` (str): Concept key (e.g. `recursion`, `binary_search`, `binary_tree`)
- `analogy` (Optional[str]): Explicit analogy text (falls back to curriculum)
- `mapping_question` (Optional[str]): Explicit mapping question

## Outputs
- Self-contained HTML card highlighting the mental model and the transfer question
