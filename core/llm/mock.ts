/**
 * Deterministic Mock LLM Provider for Zero-Key Testing & CI
 */

import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export class MockLLMProvider implements BaseLLMProvider {
  name = "mock";
  private responseQueue: any[] = [];

  enqueueResponse(response: any): void {
    this.responseQueue.push(response);
  }

  resetQueue(): void {
    this.responseQueue = [];
  }

  async complete(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (this.responseQueue.length > 0) {
      const resp = this.responseQueue.shift();
      return typeof resp === "string" ? resp : JSON.stringify(resp);
    }

    const lastMsg = messages[messages.length - 1]?.content || "";
    return `[Mock Tutor]: Let's explore "${lastMsg}". What do you predict happens next?`;
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T> {
    if (this.responseQueue.length > 0) {
      const resp = this.responseQueue.shift();
      return options.schema.parse(resp);
    }

    const lastMsg = messages[messages.length - 1]?.content || "";
    const system = options.systemPrompt || "";
    const name = options.schemaName || "";

    // 1. Diagnostician schema
    if (name === "DiagnosticResult" || system.includes("Diagnostician")) {
      const isPaste = lastMsg.length > 80 || lastMsg.includes("def ") || lastMsg.includes("function ");
      const isStuck = lastMsg.toLowerCase().includes("stuck") || lastMsg.toLowerCase().includes("no idea");
      const isMastery = lastMsg.toLowerCase().includes("got it") || lastMsg.toLowerCase().includes("i understand");

      const diagObj = {
        level: "beginner",
        frustration: isStuck ? 0.8 : 0.1,
        state: isPaste ? "COPYING_SUSPECTED" : (isStuck ? "STUCK" : (isMastery ? "MASTERY" : "LEARNING")),
        recommendedRung: isPaste ? 1 : (isStuck ? 4 : 1),
        reasoning: "Deterministic assessment based on cognitive friction and signals.",
        isDiagnosticActive: false,
        diagnosticStep: 0,
      };
      return options.schema.parse(diagObj);
    }

    // 2. Critic schema
    if (name === "CriticVerdict" || system.includes("Critic")) {
      const text = lastMsg.toLowerCase();
      // Leaks direct answer or solution code
      const hasLeak = text.includes("the answer is") || text.includes("here is the solution");
      const hasMultiQuestion = (lastMsg.match(/\?/g) || []).length > 1;

      const passed = !hasLeak && !hasMultiQuestion;
      const issues: string[] = [];
      if (hasLeak) issues.push("Draft leaks direct answer prematurely.");
      if (hasMultiQuestion) issues.push("Violates single-question rule.");

      const criticObj = {
        passed,
        issues,
        rewriteInstructions: passed ? undefined : "Enforce the One-Question Rule and remove all solution leaks.",
        answerLeaked: hasLeak,
        multipleQuestions: hasMultiQuestion,
      };
      return options.schema.parse(criticObj);
    }

    // 3. Teacher schema
    if (name === "TeacherDraft" || system.includes("Teacher")) {
      const isRung4 = system.includes("Rung 4");
      const draftObj = {
        replyText: "What do you think happens when the function invokes itself with a smaller input?",
        singleQuestion: "What do you think happens when the function invokes itself with a smaller input?",
        needsVisual: isRung4,
        visualConcept: isRung4 ? "recursion" : undefined,
        visualType: isRung4 ? "diagram" : undefined,
      };
      return options.schema.parse(draftObj);
    }

    // 4. Visualizer schema
    if (name === "VisualizerDecision" || system.includes("Visualizer")) {
      const visObj = {
        chosenSkill: "diagram",
        concept: "recursion",
        visualSpec: {
          concept: "recursion",
          mermaidSource: "graph TD\n    A[f(3)] --> B[f(2)]\n    B --> C[?BLANK?]",
          blanks: ["?BLANK?"],
          prompt: "What is the terminating condition that belongs in ?BLANK?",
        },
        reasoning: "Diagram with blanks to preserve pedagogical tension.",
      };
      return options.schema.parse(visObj);
    }

    // 5. LeakVerdict / QuizScore for Eval
    if (name === "LeakVerdict") {
      const hasLeak = lastMsg.includes("the answer is") || lastMsg.includes("here is the solution");
      return options.schema.parse({
        leakDetected: hasLeak,
        leakScore: hasLeak ? 1.0 : 0.0,
        pedagogicalValue: hasLeak ? 0.2 : 0.9,
        reasoning: hasLeak ? "Answer leaked." : "Pedagogically sound.",
      });
    }

    if (name === "QuizScore") {
      const isWeak = lastMsg.includes("no idea") || lastMsg.includes("not sure");
      return options.schema.parse({
        score: isWeak ? 0.3 : 0.85,
        rationale: "Assessed against concept rubric.",
      });
    }

    // Default fallback
    return options.schema.parse({
      replyText: "What do you think?",
      singleQuestion: "What do you think?",
      needsVisual: false,
    });
  }
}
