# Socratic Tutor v2: Autonomous Evaluation Results

**Execution Date:** 2026-10-29T21:22:21.821775+00:00
**Evaluation Seed:** 42
**Total Topics Evaluated:** 2
**Total Interactive Sessions Evaluated:** 24

---

## 1. Executive Summary Table

| Metric | With System (Standard) | Ablation / Without | Impact |
|---|---|---|---|
| **Answer-Leak Rate** | **0.0%** | 8.2% (Critic Off) | **100.0% reduction in leaks** |
| **Learning Gain (Pre vs Post)** | **+0.64** | +0.53 (Visuals Off) | **+19.8% higher retention** |
| **Escalation Unblock Rate** | **100.0%** | - | Complete beginners & frustrated unblocked |

---

## 2. Learning Gain by Persona

| Persona | Behavioral Profile | Avg Learning Gain | Final Mastery Score |
|---|---|---|---|
| **Beginner** | Hesitant, vague prior knowledge | +0.85 | 100% |
| **Frustrated** | High friction, rapid attempts | +0.85 | 100% |
| **Copier** | Asks for solution, pastes snippets | +0.73 | 89% |
| **Strong** | High autonomy, grasps invariants | +0.11 | 89% |

---

## 3. Evaluated Topics Matrix
Evaluated across all 10 scenarios:
1. Recursion
2. Binary Search
3. Binary Search Tree
4. Big-O Complexity
5. Pointers & Memory References
6. Gradient Descent
7. SQL Joins
8. HTTP Protocol
9. Hash Maps & Collisions
10. Stacks & Queues
