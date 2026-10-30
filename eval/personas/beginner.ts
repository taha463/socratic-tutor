import type { Persona, PersonaResponse } from "./types";

export class BeginnerPersona implements Persona {
  name = "beginner";
  description = "Earnest novice who makes typical conceptual mistakes, needs analogies and diagrams.";

  generatePreQuizAnswer(scenario: any): string {
    return "I think it loops until it finishes or something like a for loop.";
  }

  generatePostQuizAnswer(scenario: any): string {
    return scenario.post_quiz_answer || "It stops when the base condition is met and returns up the stack.";
  }

  respond(history: Array<{ role: string; text: string }>, topic: string): PersonaResponse {
    const turnCount = history.filter((h) => h.role === "learner").length;

    if (turnCount === 0) {
      return {
        message: `I'm trying to understand ${topic}, but it feels confusing. Can you help me?`,
        signals: { idle_seconds: 5 },
      };
    }

    if (turnCount === 1) {
      return {
        message: "I think it calls itself, but how does it know where to send the final result?",
        signals: { idle_seconds: 12, typing_duration_seconds: 10 },
      };
    }

    if (turnCount === 2) {
      return {
        message: "Oh! Looking at the diagram, the smallest call returns 1 first, right?",
        signals: { idle_seconds: 8 },
      };
    }

    return {
      message: "I think I get it now! Each frame unwinds and multiplies back up.",
      signals: { idle_seconds: 4 },
    };
  }
}

