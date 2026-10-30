import type { Persona, PersonaResponse } from "./types";

export class FrustratedPersona implements Persona {
  name = "frustrated";
  description = "Tries briefly, gets stuck, expresses high cognitive friction and tests ladder escalation.";

  generatePreQuizAnswer(scenario: any): string {
    return "No idea at all, this concept is completely frustrating.";
  }

  generatePostQuizAnswer(scenario: any): string {
    return "When the base case is reached, the calls return in reverse order.";
  }

  respond(history: Array<{ role: string; text: string }>, topic: string): PersonaResponse {
    const turnCount = history.filter((h) => h.role === "learner").length;

    if (turnCount === 0) {
      return {
        message: `I've been staring at ${topic} for hours and none of this makes any sense.`,
        signals: { idle_seconds: 45 },
      };
    }

    if (turnCount === 1) {
      return {
        message: "I am completely stuck. Can you just tell me the answer directly please?",
        signals: { idle_seconds: 50, rapid_wrong_attempts: 2 },
      };
    }

    if (turnCount === 2) {
      return {
        message: "Okay wait, the analogy with the nesting dolls helps. Does the solid doll mean the base case?",
        signals: { idle_seconds: 15 },
      };
    }

    return {
      message: "Got it. So it stops when it hits that boundary.",
      signals: { idle_seconds: 6 },
    };
  }
}
