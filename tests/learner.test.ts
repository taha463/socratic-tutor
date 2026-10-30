import { describe, it, expect, beforeEach, afterEach } from "./test-utils";
import { DiagnosticianAgent } from "../core/agents/diagnostician";
import { MockLLMProvider } from "../core/llm/mock";
import { LearnerStore } from "../core/learner";
import { initDb, closeDb } from "../storage/db";

describe("Diagnostician & Learner Model Tests", () => {
  let mockLLM: MockLLMProvider;
  let store: LearnerStore;

  beforeEach(() => {
    const db = initDb(":memory:");
    store = new LearnerStore(db);
    mockLLM = new MockLLMProvider();
  });

  afterEach(() => {
    closeDb();
  });

  it("telemetry overrides LLM when friction is high (idle > 40s recommends Rung 4 visual)", async () => {
    const diagnostician = new DiagnosticianAgent(mockLLM);
    
    const res = await diagnostician.diagnose({
      message: "I am trying to write this",
      signals: { idle_seconds: 45 },
    });

    expect(res.recommendedRung).toBe(4);
    expect(res.frustration).toBeGreaterThanOrEqual(0.4);
  });

  it("telemetry overrides when copy/paste is detected (forces COPYING_SUSPECTED and Rung 1 probe)", async () => {
    const diagnostician = new DiagnosticianAgent(mockLLM);
    
    const res = await diagnostician.diagnose({
      message: "def fib(n): return n if n<=1 else fib(n-1)+fib(n-2)",
      signals: { paste_event: true, pasted_length: 95 },
    });

    expect(res.state).toBe("COPYING_SUSPECTED");
    expect(res.recommendedRung).toBe(1);
  });

  it("telemetry escalates to STUCK when rapid wrong attempts occur", async () => {
    const diagnostician = new DiagnosticianAgent(mockLLM);

    const res = await diagnostician.diagnose({
      message: "Is it x? Is it y? What about z?",
      signals: { rapid_wrong_attempts: 4 },
    });

    expect(res.state).toBe("STUCK");
    expect(res.frustration).toBeGreaterThanOrEqual(0.3);
  });

  it("BKT updates correctly on success and failure", () => {
    store.ensureLearner("user-bkt");
    
    // Success increases knowledge
    const p1 = store.updateMastery("user-bkt", "tree_traversal", true);
    expect(p1).toBeGreaterThan(0.2);

    const p2 = store.updateMastery("user-bkt", "tree_traversal", true);
    expect(p2).toBeGreaterThan(p1);

    // Failure drops knowledge
    const p3 = store.updateMastery("user-bkt", "tree_traversal", false);
    expect(p3).toBeLessThan(p2);
  });

  it("applies Ebbinghaus forgetting curve decay", () => {
    store.ensureLearner("user-decay");
    store.updateMastery("user-decay", "binary_search", true);

    const all = store.getAllMastery("user-decay");
    expect(all).toHaveLength(1);
    expect(all[0].decayedScore).toBeLessThanOrEqual(all[0].score);
  });
});
