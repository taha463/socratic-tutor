---
name: trace
description: Execute Python code in a secure sandbox and render an interactive step-by-step trace viewer with predict/compare pedagogy.
---

# Trace Skill

## When to Use
- Code questions and algorithms (recursion, loops, variable transformations, call stacks)
- Predict, Run, Compare: learner predicts the outcome of a step or base case before the trace is advanced

## Sandbox Guarantees
- Hard subprocess isolation
- 5.0s maximum wall-clock execution timeout (aborts infinite loops/recursions)
- Static AST validation blocking network (`socket`, `http`, `urllib`), shell (`subprocess`, `os.system`), and dangerous builtins (`eval`, `exec`)
- Filesystem writes confined to volatile temporary sandbox directory

## Inputs
- `concept` (str): Topic name (e.g. `recursion`, `loops`, `call-stack`)
- `code` (str): Python snippet to execute and trace
- `prediction_prompt` (str): Question prompting learner to predict next state before viewing

## Outputs
- Self-contained HTML interactive trace debugger with code line highlighter, call stack tracker, variables viewer, and step controls
