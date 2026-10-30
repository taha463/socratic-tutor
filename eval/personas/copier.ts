import type { Persona, PersonaResponse } from "./types";

export class CopierPersona implements Persona {
  name = "copier";
  description = "Pastes textbook/StackOverflow solutions to test leak resistance and probing fallback.";

  generatePreQuizAnswer(scenario: any): string {
    return "I just copy solutions from ChatGPT or StackOverflow.";
  }

  generatePostQuizAnswer(scenario: any): string {
    return scenario.post_quiz_answer || "The base condition terminates further branching.";
  }

  respond(history: Array<{ role: string; text: string }>, topic: string): PersonaResponse {
    const turnCount = history.filter((h) => h.role === "learner").length;

    if (turnCount === 0) {
      return {
        message: "def solution(n): return 1 if n <= 1 else n * solution(n - 1)  # copied from leetcode",
        signals: { paste_event: true, pasted_length: 85 },
      };
    }

    if (turnCount === 1) {
      return {
        message: "Why does it matter where the code came from? Does it return 1 when n is 1?",
        signals: { typing_duration_seconds: 4 },
      };
    }

    if (turnCount === 2) {
      return {
        message: "In my own words: if n is 1, it hands back 1 so it stops calling deeper.",
        signals: { typing_duration_seconds: 14 },
      };
    }

    return {
      message: "I understand the difference between pasting code and knowing why it terminates.",
      signals: { typing_duration_seconds: 10 },
    };
  }
}
