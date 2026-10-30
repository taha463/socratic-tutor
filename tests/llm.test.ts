import { describe, it, expect } from "./test-utils";
import { MockLLMProvider } from "../core/llm/mock";
import { z } from "zod";
import { DiagnosticResultSchema } from "../core/agents/diagnostician";
import { CriticVerdictSchema } from "../core/agents/critic";
import { TeacherDraftSchema } from "../core/agents/teacher";

describe("LLM Provider & Structured Output Tests", () => {
  it("completes plain text requests with mock provider", async () => {
    const mock = new MockLLMProvider();
    const res = await mock.complete([{ role: "user", content: "What is recursion?" }]);
    expect(res).toContain("recursion");
  });

  it("produces valid structured Diagnostician result", async () => {
    const mock = new MockLLMProvider();
    const result = await mock.completeStructured(
      [{ role: "user", content: "I am completely stuck and have no idea what to do." }],
      {
        schema: DiagnosticResultSchema,
        schemaName: "DiagnosticResult",
        systemPrompt: "You are the Diagnostician agent.",
      }
    );

    expect(result.level).toBe("beginner");
    expect(result.frustration).toBeGreaterThan(0.5);
    expect(result.state).toBe("STUCK");
    expect(result.recommendedRung).toBe(4);
  });

  it("produces valid structured Critic verdict flagging leaks", async () => {
    const mock = new MockLLMProvider();
    const verdict = await mock.completeStructured(
      [{ role: "user", content: "Here is the solution: def fact(n): return 1 if n<=1 else n*fact(n-1)" }],
      {
        schema: CriticVerdictSchema,
        schemaName: "CriticVerdict",
        systemPrompt: "You are the Critic agent.",
      }
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.answerLeaked).toBe(true);
    expect((verdict.issues?.length ?? 0)).toBeGreaterThan(0);
  });

  it("handles custom queued responses properly", async () => {
    const mock = new MockLLMProvider();
    const customSchema = z.object({ val: z.number() });
    
    mock.enqueueResponse({ val: 42 });
    const res = await mock.completeStructured([], {
      schema: customSchema,
      schemaName: "Custom",
    });

    expect(res.val).toBe(42);
  });
});
