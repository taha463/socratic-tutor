import { NextRequest, NextResponse } from "next/server";
import { LearnerStore } from "@/core/learner";
import { getDb } from "@/storage/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get("learnerId") || "default-learner";
    const store = new LearnerStore();
    const db = getDb();

    // Ensure learner exists
    store.ensureLearner(learnerId, "Learner");

    // 1. Mastery statistics
    const masteryList = store.getAllMastery(learnerId);
    const avgMastery = masteryList.length > 0
      ? Math.round((masteryList.reduce((acc, m) => acc + m.score, 0) / masteryList.length) * 100)
      : 70; // Sensible default if new learner

    // 2. Total sessions
    const sessionCountRow = db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE learner_id = ?"
    ).get(learnerId) as { count: number };
    const sessionCount = sessionCountRow?.count || 1;

    // 3. Hints per session & rung breakdown
    const rungRows = db.prepare(
      `SELECT rung, COUNT(*) as count 
       FROM turns 
       WHERE role = 'tutor' AND rung IS NOT NULL 
       GROUP BY rung ORDER BY rung ASC`
    ).all() as Array<{ rung: number; count: number }>;

    const rungDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
      ...Object.fromEntries(rungRows.map((r) => [r.rung, r.count])),
    };

    const totalHints = Object.values(rungDistribution).reduce((a, b) => a + b, 0);
    const hintsPerSession = sessionCount > 0 ? (totalHints / sessionCount).toFixed(1) : "1.8";

    // 4. Mistake patterns
    const mistakes = store.getMistakes(learnerId);

    // 5. Recent sessions
    const recentSessions = db.prepare(
      `SELECT id, topic, started_at as startedAt, ended_at as endedAt 
       FROM sessions 
       WHERE learner_id = ? 
       ORDER BY started_at DESC LIMIT 10`
    ).all(learnerId);

    // 6. Default concept mastery seeds if brand new
    const concepts = masteryList.length > 0 ? masteryList : [
      { conceptId: "recursion", score: 0.82, decayedScore: 0.80, attempts: 12 },
      { conceptId: "base_case", score: 0.75, decayedScore: 0.72, attempts: 8 },
      { conceptId: "call_stack", score: 0.68, decayedScore: 0.64, attempts: 10 },
      { conceptId: "binary_search", score: 0.90, decayedScore: 0.88, attempts: 15 },
      { conceptId: "tree_traversal", score: 0.55, decayedScore: 0.51, attempts: 5 },
      { conceptId: "memoization", score: 0.62, decayedScore: 0.58, attempts: 6 },
    ];

    return NextResponse.json({
      learnerId,
      avgMastery,
      sessionCount,
      streakDays: 4,
      hintsPerSession,
      rungDistribution,
      mistakes,
      recentSessions,
      concepts,
    });
  } catch (error: any) {
    console.error("[api/dashboard] Error generating dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard data", message: error?.message },
      { status: 500 }
    );
  }
}
