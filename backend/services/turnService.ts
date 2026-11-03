/**
 * Backend Turn Execution Service
 * Manages the multi-agent turn processing loop, telemetry integration, and DB persistence
 */

import { TutorOrchestrator } from "@/core/orchestrator";
import type { TurnExecutionRequest, TurnExecutionResponse } from "../types";

export class TurnService {
  private orchestrator: TutorOrchestrator;

  constructor() {
    this.orchestrator = new TutorOrchestrator();
  }

  async executeTurn(req: TurnExecutionRequest): Promise<TurnExecutionResponse> {
    const { sessionId, learnerId = "default-learner", message, topic = "General", signals = {}, groundTruth } = req;

    // Delegate to core LangGraph multi-agent StateGraph orchestrator
    const result = await this.orchestrator.handleGraphTurn({
      sessionId,
      learnerId,
      message,
      topic,
      signals,
      groundTruth,
    });

    return {
      turnId: `turn-${Date.now()}`,
      role: "tutor",
      text: result.text,
      rung: result.rung,
      state: result.state as any,
      frustration: result.frustration,
      visualSpec: result.visualSpec,
      criticPassed: result.criticVerdict?.passed ?? true,
      timestamp: new Date().toISOString(),
      agentTrace: result.agentTrace,
    };
  }
}
