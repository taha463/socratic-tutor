import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { sessionService, turnService, dashboardService, ragService, getDb } from "../backend/index";

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

  it("initializes a general session with open-ended Socratic greeting", () => {
    const sessionId = "sess-gen-" + Date.now();
    const detail = sessionService.getSession(sessionId, "General");

    strictEqual(detail.sessionId, sessionId);
    strictEqual(detail.topic, "General");
    ok(detail.turns[0].text.includes("What topic, algorithm, or concept would you like to explore today?"));
  });

  it("cleans and extracts real-time web context with RAG service", async () => {
    // 1. Text cleaning
    const raw = "<b>Test &amp; &#039;quotes&#x27;</b> &quot;value&quot;";
    const cleaned = ragService.cleanText(raw);
    strictEqual(cleaned, "Test & 'quotes' \"value\"");

    // 2. Wikipedia search
    const results = await ragService.searchWikipedia("Python programming", 1);
    ok(Array.isArray(results));
    if (results.length > 0) {
      ok(results[0].title.toLowerCase().includes("python"));
      ok(results[0].snippet.length > 0);
    }

    // 3. Overall search method
    const searchContext = await ragService.search("Binary search algorithm");
    ok(typeof searchContext === "string");
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
    strictEqual(turnResponse.rung, 4, "Confusion should escalate to Rung 4 visual scaffold");
    ok(turnResponse.visualSpec, "Turn response should contain visualSpec on Rung 4");
    ok(Array.isArray(turnResponse.visualSpec.rows), "visualSpec should contain whiteboard rows");

    // Verify turn was persisted in SQLite and visualSpec is restored
    const db = getDb();
    const rows = db.prepare("SELECT * FROM turns WHERE session_id = ?").all(sessionId) as any[];
    ok(rows.length >= 2, "Both initial greeting and response should be in SQLite");

    const sessionData = sessionService.getSession(sessionId);
    const tutorTurn = sessionData.turns.find((t) => t.role === "tutor" && t.rung === 4);
    ok(tutorTurn, "Tutor turn with Rung 4 should exist");
    ok(tutorTurn.visualSpec, "Restored turn should have visualSpec parsed from DB");
    ok(Array.isArray(tutorTurn.visualSpec.rows), "Restored visualSpec should have rows");
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

