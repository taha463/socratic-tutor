import type { Persona, PersonaResponse } from "./types";

export class StrongPersona implements Persona {
  name = "strong";
  description = "High-aptitude learner who quickly grasps core concepts and tests rapid de-escalation.";

  generatePreQuizAnswer(scenario: any): string {
    return "Without a base case, recursion leads to call stack exhaustion.";
  }

  generatePostQuizAnswer(scenario: any): string {
    return scenario.post_quiz_answer || "Base cases return non-recursive values to unwind the stack.";
  }

  respond(history: Array<{ role: string; text: string }>, topic: string): PersonaResponse {
    const turnCount = history.filter((h) => h.role === "learner").length;

    if (turnCount === 0) {
      return {
        message: `I understand basic functions, but want to make sure I reason about ${topic} mathematically.`,
        signals: { idle_seconds: 5 },
      };
    }

    if (turnCount === 1) {
      return {
        message: "When n reaches 1, fact(1) evaluates to 1 and returns to fact(2), which computes 2 * 1.",
        signals: { typing_duration_seconds: 12 },
      };
    }

    return {
      message: "Then fact(3) computes 3 * 2 = 6. The invariant is that subproblems strictly shrink.",
      signals: { typing_duration_seconds: 8 },
    };
  }
}

