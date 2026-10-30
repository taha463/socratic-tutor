import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { sessionService, turnService, dashboardService, getDb } from "../backend/index";

describe("Backend Service Layer Tests", () => {
  it("initializes a new session with a tailored Socratic greeting for any topic", () => {
    const sessionId = "sess-test-" + Date.now();
    const detail = sessionService.getSession(sessionId, "Binary Search");

    strictEqual(detail.sessionId, sessionId);
    strictEqual(detail.topic, "Binary Search");
    strictEqual(detail.currentRung, 1);
    ok(detail.turns.length >= 1, "Session should have opening greeting turn");
    strictEqual(detail.turns[0].role, "tutor");
    ok(detail.turns[0].text.toLowerCase().includes("binary search") || detail.turns[0].text.toLowerCase().includes("phonebook"));
  });

  it("processes a real turn with behavioral signals and persists in SQLite", async () => {
    const sessionId = "sess-test-" + Date.now();
    sessionService.getSession(sessionId, "Recursion");

    const turnResponse = await turnService.executeTurn({
      sessionId,
      message: "I am confused about what happens when the base case is reached.",
      topic: "Recursion",
      signals: {
        typing_duration_seconds: 18,
        tab_switches: 2,
        paste_event: false,
        idle_seconds: 5,
      },
    });

    strictEqual(turnResponse.role, "tutor");
    ok(turnResponse.rung >= 1 && turnResponse.rung <= 7);
    ok(turnResponse.text.length > 0);

    // Verify turn was persisted in SQLite
    const db = getDb();
    const rows = db.prepare("SELECT * FROM turns WHERE session_id = ?").all(sessionId) as any[];
    ok(rows.length >= 2, "Both initial greeting and response should be in SQLite");
  });

  it("computes live dashboard metrics from real SQLite rows", () => {
    const metrics = dashboardService.getMetrics("default-learner");

    ok(metrics.sessionCount >= 1, "Session count should be positive");
    ok(metrics.avgMastery >= 0 && metrics.avgMastery <= 100);
    ok(Array.isArray(metrics.recentSessions), "recentSessions must be an array");
    ok(Array.isArray(metrics.concepts), "concepts must be an array");
    ok(typeof metrics.rungDistribution === "object");
  });
});
