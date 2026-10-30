/**
 * Socratic Tutor Backend Module Entry Point
 * Unified export of Database, Services, Orchestrator, and Types
 */

import { SessionService } from "./services/sessionService";
import { TurnService } from "./services/turnService";
import { DashboardService } from "./services/dashboardService";
import { getDb, closeDb } from "./db";
import { TutorOrchestrator } from "@/core/orchestrator";
import { getLLMClient } from "@/core/llm";

export * from "./types";
export * from "./services/sessionService";
export * from "./services/turnService";
export * from "./services/dashboardService";
export { getDb, closeDb, TutorOrchestrator, getLLMClient };

// Singleton Service Instances
export const sessionService = new SessionService();
export const turnService = new TurnService();
export const dashboardService = new DashboardService();
