/**
 * Socratic LangGraph Module: High-Level API & Execution Runner.
 */

import crypto from "node:crypto";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildSocraticGraph, getSocraticGraphMermaid } from "./builder";
import { SocraticGraphCheckpointer } from "./checkpointer";
import type { SocraticGraphStateType } from "./state";
import type { SocraticNodeDependencies } from "./nodes";
import type { TutorResponse } from "../orchestrator";
import { RUNG_DEFINITIONS } from "../ladder";

export * from "./state";
export * from "./nodes";
export * from "./builder";
export * from "./checkpointer";

export interface SocraticGraphTurnInput {
  sessionId: string;
  learnerId: string;
  message: string;
  topic?: string;
  signals?: Record<string, any>;
  groundTruth?: string | null;
}

/**
 * Runs a single conversational turn through the compiled LangGraph StateGraph,
 * handling persistence, cyclic critic review, and checkpointing.
 */
export async function runSocraticGraphTurn(
  input: SocraticGraphTurnInput,
  deps: SocraticNodeDependencies,
  checkpointer?: SocraticGraphCheckpointer
): Promise<TutorResponse> {
  const {
    sessionId,
    learnerId,
    message,
    topic = "general",
    signals = {},
    groundTruth = null,
  } = input;

  const now = new Date().toISOString();
  const cp = checkpointer || new SocraticGraphCheckpointer();

  // 1. Ensure records exist in LearnerStore
  deps.learnerStore.ensureSession(sessionId, learnerId, topic);

  for (const [k, v] of Object.entries(signals)) {
    if (typeof v === "number") {
      deps.learnerStore.recordSignal(sessionId, k, v);
    }
  }

  // 2. Persist learner message
  const learnerTurnId = crypto.randomUUID();
  deps.learnerStore.recordTurn({
    id: learnerTurnId,
    sessionId,
    role: "learner",
    text: message,
    signalsJson: JSON.stringify(signals),
    ts: now,
  });

  // 3. Retrieve prior turns for history & current rung
  const priorTurns = deps.learnerStore.getTurns(sessionId);
  const history = priorTurns.slice(0, -1).map((t) => ({
    role: t.role === "learner" ? "user" as const : "assistant" as const,
    content: t.text,
  }));

  let lastTutorRung = 1;
  for (let i = priorTurns.length - 2; i >= 0; i--) {
    if (priorTurns[i].role === "tutor" && priorTurns[i].rung) {
      lastTutorRung = priorTurns[i].rung!;
      break;
    }
  }

  // 4. Compile the LangGraph workflow
  const graph = buildSocraticGraph(deps).compile();

  // 5. Build initial graph state
  const initialState: Partial<SocraticGraphStateType> = {
    sessionId,
    learnerId,
    topic,
    learnerMessage: message,
    groundTruth,
    signals,
    history,
    currentRung: lastTutorRung,
    messages: [new HumanMessage(message)],
    rewriteCount: 0,
    rewriteInstructions: null,
  };

  // 6. Execute supersteps through the StateGraph
  const finalState = (await graph.invoke(initialState)) as SocraticGraphStateType;

  const approvedText = finalState.finalReply || "What do you think happens next?";
  const activeRung = finalState.currentRung || 1;
  const rungName = RUNG_DEFINITIONS[activeRung]?.name || "Probe";

  // 7. Persist tutor turn in SQLite
  const tutorTurnId = crypto.randomUUID();
  deps.learnerStore.recordTurn({
    id: tutorTurnId,
    sessionId,
    role: "tutor",
    text: approvedText,
    rung: activeRung,
    skillUsed: finalState.visualSpec ? JSON.stringify(finalState.visualSpec) : null,
    criticVerdict: JSON.stringify({
      verdict: finalState.criticVerdict,
      agentTrace: finalState.agentTrace,
    }),
    ts: new Date().toISOString(),
  });

  // 8. Snapshot LangGraph state into SQLite Checkpointer for Time-Travel
  const latestCp = cp.getLatestCheckpoint(sessionId);
  cp.saveCheckpoint({
    threadId: sessionId,
    parentCheckpointId: latestCp?.id ?? null,
    state: {
      ...finalState,
      messages: [
        ...(finalState.messages || []),
        new AIMessage(approvedText),
      ],
    },
    metadata: {
      turnId: tutorTurnId,
      rung: activeRung,
      criticPassed: finalState.criticPassed,
      rewritesDone: finalState.rewriteCount,
    },
  });

  return {
    text: approvedText,
    sessionId,
    learnerId,
    rung: activeRung,
    rungName,
    visualSpec: finalState.visualSpec,
    state: finalState.learnerState || "ENGAGED",
    frustration: finalState.frustration || 0,
    criticVerdict: finalState.criticVerdict ?? undefined,
    criticPassed: finalState.criticPassed ?? true,
    rewritesDone: finalState.rewriteCount || 0,
    agentTrace: finalState.agentTrace ?? undefined,
  };
}

