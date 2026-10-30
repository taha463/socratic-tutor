---
name: trace
description: Step-by-step code execution tracer with call stack, variables, line highlighting, and predict-first flow.
---

# Trace Skill

## When to Use
Use when a learner has code-level misconceptions (e.g. recursion termination, variable mutation, loop indices).

## Invariant
Runs client-side in browser Web Workers (Pyodide for Python, sandboxed Worker for JS). Server NEVER executes learner code.
The learner is prompted to predict the next return value or variable change before revealing the trace.
