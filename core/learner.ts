/**
 * Learner Model & SQLite Persistence: BKT Mastery, Ebbinghaus Decay, Signals & Mistake Tracking
 */

import { DatabaseSync } from "node:sqlite";
import { getDb } from "../storage/db";

export interface TurnRecord {
  id: string;
  sessionId: string;
  role: "learner" | "tutor" | "system";
  text: string;
  rung?: number | null;
  skillUsed?: string | null;
  signalsJson?: string | null;
  criticVerdict?: string | null;
  ts: string;
}

export class LearnerStore {
  private db: DatabaseSync;

  // Bayesian Knowledge Tracing (BKT) Parameters
  private pL0: number = 0.2; // Prior probability of knowing
  private pT: number = 0.15; // Transition probability (learning step)
  private pG: number = 0.20; // Guess probability
  private pS: number = 0.10; // Slip probability

  constructor(customDb?: DatabaseSync) {
    this.db = customDb || getDb();
  }

  ensureLearner(id: string, name?: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      "INSERT OR IGNORE INTO learners (id, name, created_at) VALUES (?, ?, ?)"
    ).run(id, name || id, now);
  }

  ensureSession(id: string, learnerId: string, topic: string): void {
    this.ensureLearner(learnerId);
    const now = new Date().toISOString();
    this.db.prepare(
      "INSERT OR IGNORE INTO sessions (id, learner_id, topic, started_at) VALUES (?, ?, ?, ?)"
    ).run(id, learnerId, topic, now);
  }

  recordTurn(turn: TurnRecord): void {
    this.db.prepare(
      `INSERT INTO turns (id, session_id, role, text, rung, skill_used, signals_json, critic_verdict, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      turn.id,
      turn.sessionId,
      turn.role,
      turn.text,
      turn.rung ?? null,
      turn.skillUsed ?? null,
      turn.signalsJson ?? null,
      turn.criticVerdict ?? null,
      turn.ts
    );
  }

  getTurns(sessionId: string): TurnRecord[] {
    const stmt = this.db.prepare(
      `SELECT id, session_id as sessionId, role, text, rung, 
              skill_used as skillUsed, signals_json as signalsJson, 
              critic_verdict as criticVerdict, ts 
       FROM turns WHERE session_id = ? ORDER BY ts ASC`
    );
    return stmt.all(sessionId) as unknown as TurnRecord[];
  }

  recordSignal(sessionId: string, type: string, value: number): void {
    const now = new Date().toISOString();
    this.db.prepare(
      "INSERT INTO signals (session_id, ts, type, value) VALUES (?, ?, ?, ?)"
    ).run(sessionId, now, type, value);
  }

  getSignals(sessionId: string): Array<{ type: string; value: number; ts: string }> {
    const stmt = this.db.prepare("SELECT type, value, ts FROM signals WHERE session_id = ? ORDER BY ts ASC");
    return stmt.all(sessionId) as any[];
  }

  updateMastery(learnerId: string, conceptId: string, isSuccess: boolean): number {
    this.ensureLearner(learnerId);
    const now = new Date().toISOString();
    const current = this.getMastery(learnerId, conceptId) ?? this.pL0;

    let pKnownGivenObs: number;
    if (isSuccess) {
      const num = current * (1 - this.pS);
      const den = num + (1 - current) * this.pG;
      pKnownGivenObs = num / (den || 1);
    } else {
      const num = current * this.pS;
      const den = num + (1 - current) * (1 - this.pG);
      pKnownGivenObs = num / (den || 1);
    }

    const nextScore = Math.max(0.01, Math.min(0.99, pKnownGivenObs + (1 - pKnownGivenObs) * this.pT));

    this.db.prepare(
      `INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(learner_id, concept_id) DO UPDATE SET
         score = ?,
         attempts = attempts + 1,
         last_seen = ?,
         updated_at = ?`
    ).run(learnerId, conceptId, nextScore, now, now, nextScore, now, now);

    return nextScore;
  }

  getMastery(learnerId: string, conceptId: string): number | null {
    const stmt = this.db.prepare(
      "SELECT score FROM mastery WHERE learner_id = ? AND concept_id = ?"
    );
    const row = stmt.get(learnerId, conceptId) as { score: number } | undefined;
    return row ? row.score : null;
  }

  getAllMastery(learnerId: string): Array<{
    conceptId: string;
    score: number;
    attempts: number;
    lastSeen: string;
    decayedScore: number;
  }> {
    const stmt = this.db.prepare(
      "SELECT concept_id as conceptId, score, attempts, last_seen as lastSeen FROM mastery WHERE learner_id = ?"
    );
    const rows = stmt.all(learnerId) as any[];
    const now = Date.now();

    return rows.map((r) => {
      const daysPassed = Math.max(0, (now - new Date(r.lastSeen).getTime()) / (1000 * 60 * 60 * 24));
      // Ebbinghaus forgetting curve with 30-day stability
      const decayedScore = Math.min(r.score, r.score * Math.exp(-daysPassed / 30));
      return {
        ...r,
        decayedScore: Math.round(decayedScore * 1000) / 1000,
      };
    });
  }

  getWeakConcepts(learnerId: string, threshold: number = 0.65): Array<{
    conceptId: string;
    score: number;
    decayedScore: number;
  }> {
    const all = this.getAllMastery(learnerId);
    return all.filter((c) => c.decayedScore < threshold);
  }

  recordMistake(learnerId: string, conceptId: string, pattern: string): void {
    this.ensureLearner(learnerId);
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO mistakes (learner_id, concept_id, pattern, count, last_seen)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(learner_id, concept_id, pattern) DO UPDATE SET
         count = count + 1,
         last_seen = ?`
    ).run(learnerId, conceptId, pattern, now, now);
  }

  getMistakes(learnerId: string): Array<{ conceptId: string; pattern: string; count: number }> {
    const stmt = this.db.prepare(
      "SELECT concept_id as conceptId, pattern, count FROM mistakes WHERE learner_id = ? ORDER BY count DESC"
    );
    return stmt.all(learnerId) as any[];
  }
}
