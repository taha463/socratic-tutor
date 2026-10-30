/**
 * Teacher Agent: Generates Socratic responses observing the One-Question Rule and zero answer leaks.
 */

import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { BaseLLMProvider, ChatMessage } from "../llm/types";
import { getLLMClient } from "../llm";

export const TeacherDraftSchema = z.object({
  replyText: z.string(),
  singleQuestion: z.string(),
  needsVisual: z.boolean().default(false),
  visualConcept: z.string().optional().nullable(),
  visualType: z
    .enum(["diagram", "trace", "eli5", "analogy", "plot", "animate", "three_d"])
    .optional()
    .nullable(),
});

export type TeacherDraft = z.infer<typeof TeacherDraftSchema>;

export class TeacherAgent {
  private basePrompt: string;
  private llm: BaseLLMProvider;

  constructor(llm?: BaseLLMProvider) {
    this.llm = llm || getLLMClient();
    const promptPath = path.resolve(process.cwd(), "core/agents/prompts/teacher.txt");
    this.basePrompt = fs.readFileSync(promptPath, "utf-8");
  }

  async draft(params: {
    topic: string;
    learnerMessage: string;
    history: ChatMessage[];
    rung: number;
    frustration?: number;
    learnerState?: string;
    behavioralSignals?: Record<string, any>;
    rewriteInstructions?: string | null;
    groundTruth?: string | null;
    factualGrounding?: string | null;
  }): Promise<TeacherDraft> {
    const {
      topic,
      learnerMessage,
      history,
      rung,
      frustration = 0,
      learnerState = "LEARNING",
      behavioralSignals = {},
      rewriteInstructions,
      groundTruth,
      factualGrounding,
    } = params;

    let systemPrompt = `${this.basePrompt}

CURRENT CONTEXT:
- Active Topic: ${topic}
- Target Ladder Rung: Rung ${rung}
- Learner Cognitive State: ${learnerState}
- Estimated Frustration: ${frustration.toFixed(2)}
- Observed Telemetry Signals: ${JSON.stringify(behavioralSignals)}`;

    if (groundTruth) {
      systemPrompt += `\n- TARGET CONCEPT / GROUND TRUTH (DO NOT LEAK BEFORE RUNG 7): ${groundTruth}`;
    }

    if (factualGrounding) {
      systemPrompt += `\n\nREAL-TIME FACTUAL GROUNDING (FROM WEB / RAG):\n${factualGrounding}\n(Use these facts to guide your Socratic inquiry with realistic context and constraints, but NEVER leak the final answer directly below Rung 7.)`;
    }

    if (rewriteInstructions) {
      systemPrompt += `\n\nCRITIC REWRITE INSTRUCTIONS (PREVIOUS ATTEMPT FAILED QUALITY GATE):\n${rewriteInstructions}\nYou MUST correct these issues.`;
    }

    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: learnerMessage },
    ];

    try {
      const draft = await this.llm.completeStructured(messages, {
        schema: TeacherDraftSchema,
        schemaName: "TeacherDraft",
        systemPrompt,
        temperature: 0.3,
      });
      return {
        replyText: draft.replyText,
        singleQuestion: draft.singleQuestion,
        needsVisual: Boolean(draft.needsVisual),
        visualConcept: draft.visualConcept,
        visualType: draft.visualType,
      };
    } catch {
      // Safe fallback observing the One-Question Rule
      return {
        replyText: `Let's break down ${topic} step by step. What do you think happens first?`,
        singleQuestion: "What do you think happens first?",
        needsVisual: false,
      };
    }
  }
}
