import { describe, it, expect, beforeEach, afterEach } from "./test-utils";
import { initDb, closeDb } from "../storage/db";
import { LearnerStore } from "../core/learner";

describe("Storage & Learner Model Tests", () => {
  let store: LearnerStore;

  beforeEach(() => {
    const db = initDb(":memory:");
    store = new LearnerStore(db);
  });

  afterEach(() => {
    closeDb();
  });

  it("creates learners and sessions cleanly", () => {
    store.ensureLearner("learner-1", "Alice");
    store.ensureSession("sess-1", "learner-1", "recursion");
    
    // Idempotent calls should not throw
    expect(() => store.ensureLearner("learner-1")).not.toThrow();
    expect(() => store.ensureSession("sess-1", "learner-1", "recursion")).not.toThrow();
  });

  it("records and retrieves turns with full metadata", () => {
    store.ensureSession("sess-1", "learner-1", "recursion");
    
    store.recordTurn({
      id: "turn-1",
      sessionId: "sess-1",
      role: "learner",
      text: "How do I stop infinite recursion?",
      ts: "2026-10-30T01:00:00.000Z",
    });

    store.recordTurn({
      id: "turn-2",
      sessionId: "sess-1",
      role: "tutor",
      text: "What condition tells the function it does not need to call itself anymore?",
      rung: 1,
      skillUsed: "analogy",
      signalsJson: JSON.stringify({ typingSpeedWpm: 45 }),
      criticVerdict: "APPROVED",
      ts: "2026-10-30T01:00:05.000Z",
    });

    const turns = store.getTurns("sess-1");
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe("learner");
    expect(turns[1].rung).toBe(1);
    expect(turns[1].skillUsed).toBe("analogy");
    expect(turns[1].criticVerdict).toBe("APPROVED");
  });

  it("records and retrieves behavioral signals", () => {
    store.ensureSession("sess-1", "learner-1", "recursion");
    store.recordSignal("sess-1", "paste", 1);
    store.recordSignal("sess-1", "idle", 35);

    const signals = store.getSignals("sess-1");
    expect(signals).toHaveLength(2);
    expect(signals[0].type).toBe("paste");
    expect(signals[1].type).toBe("idle");
    expect(signals[1].value).toBe(35);
  });

  it("updates Bayesian Knowledge Tracing mastery and decays with time", () => {
    store.ensureLearner("learner-1");

    // Initial mastery should be prior or null before record
    expect(store.getMastery("learner-1", "base_case")).toBeNull();

    // Success increases score
    const s1 = store.updateMastery("learner-1", "base_case", true);
    expect(s1).toBeGreaterThan(0.20);

    const s2 = store.updateMastery("learner-1", "base_case", true);
    expect(s2).toBeGreaterThan(s1);

    // Failure drops score
    const s3 = store.updateMastery("learner-1", "base_case", false);
    expect(s3).toBeLessThan(s2);

    const all = store.getAllMastery("learner-1");
    expect(all).toHaveLength(1);
    expect(all[0].conceptId).toBe("base_case");
    expect(all[0].decayedScore).toBeLessThanOrEqual(all[0].score);
  });

  it("records and tallies mistake patterns", () => {
    store.ensureLearner("learner-1");
    store.recordMistake("learner-1", "recursion", "missing_base_case");
    store.recordMistake("learner-1", "recursion", "missing_base_case");
    store.recordMistake("learner-1", "recursion", "wrong_return_type");

    const mistakes = store.getMistakes("learner-1");
    expect(mistakes).toHaveLength(2);
    const missing = mistakes.find((m) => m.pattern === "missing_base_case");
    expect(missing?.count).toBe(2);
  });
});
