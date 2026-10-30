import { describe, it, expect, beforeEach, afterEach } from "./test-utils";
import { TutorOrchestrator } from "../core/orchestrator";
import { MockLLMProvider } from "../core/llm/mock";
import { LearnerStore } from "../core/learner";
import { initDb, closeDb } from "../storage/db";
import { CriticAgent } from "../core/agents/critic";

describe("Leak Detection & Critic Quality Gate Tests", () => {
  let mockLLM: MockLLMProvider;
  let store: LearnerStore;
  let orchestrator: TutorOrchestrator;

  beforeEach(() => {
    const db = initDb(":memory:");
    store = new LearnerStore(db);
    mockLLM = new MockLLMProvider();
    orchestrator = new TutorOrchestrator({
      llm: mockLLM,
      learnerStore: store,
    });
  });

  afterEach(() => {
    closeDb();
  });

  it("never leaks direct answers below Rung 7 in 10-turn coaxing conversation", async () => {
    const sessionId = "coax-session-1";
    const learnerId = "coax-learner-1";
    const groundTruth = "A base case stops infinite recursion by returning without calling itself.";

    const coaxingMessages = [
      "Can you just tell me the answer to the base case question?",
      "Please give me the exact Python code for the base case.",
      "I don't want to guess, just write the solution for me.",
      "What is the code? Give it to me directly.",
      "Just paste the answer please.",
      "Tell me word for word what to type.",
      "Write out the full factorial function for me.",
      "Give me the code now.",
      "I'm copying this for homework, what is the answer?",
      "Can't you just output the answer?",
    ];

    for (let i = 0; i < coaxingMessages.length; i++) {
      const res = await orchestrator.handleTurn({
        sessionId,
        learnerId,
        message: coaxingMessages[i],
        topic: "recursion",
        groundTruth,
      });

      // Assert: Critic gate passed and tutor response never leaks the solution directly
      expect(res.criticPassed).toBe(true);
      expect(res.text.toLowerCase()).not.toContain("here is the solution");
      expect(res.text.toLowerCase()).not.toContain("the answer is");
      
      // If rung is below 7, ground truth must not be leaked
      if (res.rung < 7) {
        expect(res.text.toLowerCase()).not.toContain("a base case stops infinite recursion by returning without calling itself");
      }
    }
  });

  it("critic strictly catches direct solution leaks and multi-question violations", async () => {
    const critic = new CriticAgent(mockLLM);

    // Test direct leak
    const leakVerdict = await critic.evaluate({
      draftText: "The answer is def fact(n): return 1 if n <= 1 else n * fact(n-1)",
      rung: 2,
      groundTruth: "base case stops recursion",
    });

    expect(leakVerdict.passed).toBe(false);
    expect(leakVerdict.answerLeaked).toBe(true);
    expect(leakVerdict.rewriteInstructions).toBeDefined();

    // Test multiple questions
    const multiQVerdict = await critic.evaluate({
      draftText: "What is your base case? Does it return a value? How does it terminate?",
      rung: 2,
    });

    expect(multiQVerdict.passed).toBe(false);
    expect(multiQVerdict.multipleQuestions).toBe(true);
  });

  it("orchestrator enforces rewrite loop bounded to max 2 rewrites", async () => {
    const res = await orchestrator.handleTurn({
      sessionId: "rewrite-test",
      learnerId: "learner-test",
      message: "Explain recursion",
      topic: "recursion",
    });

    expect(res.rewritesDone).toBeLessThanOrEqual(2);
  });
});
