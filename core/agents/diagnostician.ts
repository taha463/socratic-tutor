/**
 * Diagnostician Agent: Evaluates learner signals, emotional state, and recommended ladder rung.
 */

import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { BaseLLMProvider, ChatMessage } from "../llm/types";
import { getLLMClient } from "../llm";

export const DiagnosticResultSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  frustration: z.number().min(0).max(1).default(0.1),
  state: z.enum(["LEARNING", "STUCK", "MASTERY", "COPYING_SUSPECTED"]).default("LEARNING"),
  recommendedRung: z.number().min(1).max(7).default(1),
  reasoning: z.string(),
  isDiagnosticActive: z.boolean().default(false),
  diagnosticStep: z.number().default(0),
});

export type DiagnosticResult = z.infer<typeof DiagnosticResultSchema>;

export class DiagnosticianAgent {
  private basePrompt: string;
  private llm: BaseLLMProvider;

  constructor(llm?: BaseLLMProvider) {
    this.llm = llm || getLLMClient();
    const promptPath = path.resolve(process.cwd(), "core/agents/prompts/diagnostician.txt");
    this.basePrompt = fs.readFileSync(promptPath, "utf-8");
  }

  async diagnose(params: {
    message: string;
    signals?: Record<string, any>;
    history?: ChatMessage[];
    priorMastery?: number | null;
    priorTurnsCount?: number;
  }): Promise<DiagnosticResult> {
    const { message, signals = {}, history = [], priorMastery, priorTurnsCount = 0 } = params;

    // Layer 1: Deterministic behavioral heuristics
    let heuristicState: "LEARNING" | "STUCK" | "MASTERY" | "COPYING_SUSPECTED" | null = null;
    let heuristicFrustrationBoost = 0.0;
    let heuristicRung: number | null = null;
    const heuristicNotes: string[] = [];

    // Signal: Large paste detected
    const pasteLen = Number(signals.pasted_length || signals.pastedLength || 0);
    const isPaste = Boolean(signals.paste_event || signals.pasteEvent) || pasteLen > 80;
    if (isPaste) {
      heuristicState = "COPYING_SUSPECTED";
      heuristicRung = 1; // Probe conceptual comprehension
      heuristicNotes.push("Large paste detected: probe conceptual comprehension.");
    }

    // Signal: Instant hint request without attempt
    if (signals.instant_hint_request || signals.instantHint) {
      heuristicRung = 1;
      heuristicNotes.push("Instant hint requested without attempt: step back to initial probe.");
    }

    // Signal: Long idle / cognitive overload
    const idleTime = Number(signals.idle_seconds || signals.idleSeconds || 0);
    if (idleTime > 40) {
      heuristicFrustrationBoost += 0.4;
      heuristicRung = 4; // Offer visual scaffold
      heuristicNotes.push(`Extended idle time (${idleTime}s): high cognitive friction, offer visual.`);
    }

    // Signal: Rapid wrong attempts
    const rapidAttempts = Number(signals.rapid_wrong_attempts || signals.rapidAttempts || 0);
    if (rapidAttempts >= 3) {
      heuristicState = "STUCK";
      heuristicFrustrationBoost += 0.3;
      heuristicNotes.push("Rapid repeated failed attempts: escalate ladder.");
    }

    // Check for first-session 3-question diagnostic
    let isDiagnosticActive = false;
    let diagnosticStep = 0;
    if (priorTurnsCount < 3 && priorMastery == null) {
      isDiagnosticActive = true;
      diagnosticStep = priorTurnsCount + 1;
    }

    // Layer 2: LLM structured evaluation
    const systemPrompt = `${this.basePrompt}

OBSERVED CONTEXT & TELEMETRY:
- Prior Turns in Session: ${priorTurnsCount}
- Prior Mastery Score: ${priorMastery ?? "Unassessed"}
- Client Signals: ${JSON.stringify(signals)}
- Behavioral Flags: ${heuristicNotes.join("; ") || "None"}
- Diagnostic Active: ${isDiagnosticActive} (Step ${diagnosticStep})`;

    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: `Learner message: "${message}"` },
    ];

    try {
      const result = await this.llm.completeStructured(messages, {
        schema: DiagnosticResultSchema,
        schemaName: "DiagnosticResult",
        systemPrompt,
        temperature: 0.2,
      });

      return {
        level: result.level || "beginner",
        frustration: Math.min(1.0, (result.frustration ?? 0.1) + heuristicFrustrationBoost),
        state: heuristicState || result.state || "LEARNING",
        recommendedRung: heuristicRung || result.recommendedRung || 1,
        reasoning: result.reasoning || "Assessment complete.",
        isDiagnosticActive,
        diagnosticStep,
      };
    } catch {
      // Safe fallback
      return {
        level: "beginner",
        frustration: Math.min(1.0, 0.2 + heuristicFrustrationBoost),
        state: heuristicState || "LEARNING",
        recommendedRung: heuristicRung || 1,
        reasoning: "Fallback diagnosis applied.",
        isDiagnosticActive,
        diagnosticStep,
      };
    }
  }
}
