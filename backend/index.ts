/**
 * Socratic Tutor Backend Module Entry Point
 * Unified export of Database, Services, Orchestrator, and Types
 */

import { SessionService } from "./services/sessionService";
import { TurnService } from "./services/turnService";
import { DashboardService } from "./services/dashboardService";
import { RagService, ragService } from "./services/ragService";
import { SketchService, sketchService } from "./services/sketchService";
import { CertificateService, certificateService } from "./services/certificateService";
import { getDb, closeDb } from "./db";
import { TutorOrchestrator } from "@/core/orchestrator";
import { getLLMClient } from "@/core/llm";

export * from "./types";
export * from "./services/sessionService";
export * from "./services/turnService";
export * from "./services/dashboardService";
export * from "./services/ragService";
export * from "./services/sketchService";
export * from "./services/certificateService";
export { getDb, closeDb, TutorOrchestrator, getLLMClient };

// Singleton Service Instances
export const sessionService = new SessionService();
export const turnService = new TurnService();
export const dashboardService = new DashboardService();
export { ragService, sketchService, certificateService };

