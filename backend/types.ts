/**
 * Backend Data Transfer Objects & Interfaces
 */

import type { AgentDeliberationTrace } from "../core/orchestrator";

export type { AgentDeliberationTrace };

export interface ClientSignals {
  typing_duration_seconds?: number;
  tab_switches?: number;
  paste_event?: boolean;
  pasted_length?: number;
  idle_seconds?: number;
  instant_hint_request?: boolean;
}

export interface TurnExecutionRequest {
  sessionId: string;
  learnerId?: string;
  message: string;
  topic?: string;
  signals?: ClientSignals;
  groundTruth?: string | null;
}

export interface TurnExecutionResponse {
  turnId: string;
  role: "tutor";
  text: string;
  rung: number;
  state: "LEARNING" | "STUCK" | "MASTERY" | "COPYING_SUSPECTED" | "NEEDS_TRANSFER_CHECK";
  frustration: number;
  visualSpec?: Record<string, any> | null;
  criticPassed: boolean;
  timestamp: string;
  agentTrace?: AgentDeliberationTrace;
}

export interface SessionTurnDTO {
  id: string;
  sessionId: string;
  role: "learner" | "tutor" | "system";
  text: string;
  rung?: number;
  visualSpec?: Record<string, any> | null;
  signals?: ClientSignals;
  timestamp: string;
  agentTrace?: AgentDeliberationTrace;
}

export interface SessionDetailDTO {
  sessionId: string;
  learnerId: string;
  topic: string;
  currentRung: number;
  frustration: number;
  startedAt: string;
  endedAt?: string | null;
  turns: SessionTurnDTO[];
  initialGreeting?: string;
}

export interface DashboardMetricDTO {
  learnerId: string;
  avgMastery: number;
  sessionCount: number;
  streakDays: number;
  hintsPerSession: string;
  rungDistribution: Record<number, number>;
  mistakes: Array<{ id: string; category: string; count: number; resolved: boolean }>;
  recentSessions: Array<{
    id: string;
    topic: string;
    startedAt: string;
    endedAt?: string | null;
    turnCount: number;
    highestRung: number;
    result: string;
  }>;
  concepts: Array<{
    conceptId: string;
    name: string;
    score: number;
    decayedScore: number;
    attempts: number;
    lastSeen: string;
  }>;
  activityByDay: Record<string, number>;
}

