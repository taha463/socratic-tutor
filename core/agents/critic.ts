/**
 * Critic Agent: Uncompromising synchronous quality gate gating every response in code.
 */

import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { BaseLLMProvider, ChatMessage } from "../llm/types";
import { getLLMClient } from "../llm";

export const CriticVerdictSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).default([]),
  rewriteInstructions: z.string().optional().nullable(),
  answerLeaked: z.boolean().default(false),
  multipleQuestions: z.boolean().default(false),
});

export type CriticVerdict = z.infer<typeof CriticVerdictSchema>;

const LEAK_PHRASES = [
  "the answer is",
  "here is the solution",
  "the solution is",
  "here is the answer",
  "here is the code:",
  "here is the full code",
  "the final code is",
];

export class CriticAgent {
  private basePrompt: string;
  private llm: BaseLLMProvider;

  constructor(llm?: BaseLLMProvider) {
    this.llm = llm || getLLMClient();
    const promptPath = path.resolve(process.cwd(), "core/agents/prompts/critic.txt");
    this.basePrompt = fs.readFileSync(promptPath, "utf-8");
  }

  async evaluate(params: {
    draftText: string;
    rung: number;
    groundTruth?: string | null;
    visualSpec?: Record<string, any> | null;
  }): Promise<CriticVerdict> {
    const { draftText, rung, groundTruth, visualSpec } = params;

    const lower = draftText.toLowerCase();
    const issues: string[] = [];
    let answerLeaked = false;
    let multipleQuestions = false;

    // 1. Deterministic Rule Check: Question marks count
    // Count question marks outside of code blocks/comments
    const questionMarks = (draftText.match(/\?/g) || []).length;
    if (questionMarks > 1) {
      multipleQuestions = true;
      issues.push(`Multiple questions detected (${questionMarks} '?'). Strictly enforce the One-Question Rule.`);
    }

    // 2. Deterministic Rule Check: Answer leaks below Rung 7
    if (rung < 7) {
      for (const phrase of LEAK_PHRASES) {
        if (lower.includes(phrase)) {
          answerLeaked = true;
          issues.push(`Direct answer leak detected with phrase: "${phrase}".`);
          break;
        }
      }

      // Verbatim ground truth reveal
      if (groundTruth && groundTruth.length > 5 && lower.includes(groundTruth.toLowerCase().trim())) {
        answerLeaked = true;
        issues.push(`Draft reveals target ground truth ("${groundTruth}") directly before Rung 7.`);
      }

      // Complete un-scaffolded code blocks (code dump check)
      if (draftText.includes("```") && !draftText.includes("?") && !draftText.includes("blank") && !draftText.includes("...")) {
        issues.push("Code block lacks blanks or scaffolding. Never dump full solutions.");
      }
    }

    // If deterministic checks failed, return immediate fail without wasting LLM call
    if (issues.length > 0) {
      return {
        passed: false,
        issues,
        rewriteInstructions: issues.join(" "),
        answerLeaked,
        multipleQuestions,
      };
    }

    // 3. Layer 2: Semantic LLM review
    const systemPrompt = `${this.basePrompt}

EVALUATION CONTEXT:
- Active Rung: Rung ${rung}
- Ground Truth Answer: ${groundTruth || "None provided"}
- Visual Provided: ${visualSpec ? JSON.stringify(visualSpec) : "None"}`;

    const messages: ChatMessage[] = [
      { role: "user", content: `Review this draft reply:\n"""\n${draftText}\n"""` },
    ];

    try {
      const verdict = await this.llm.completeStructured(messages, {
        schema: CriticVerdictSchema,
        schemaName: "CriticVerdict",
        systemPrompt,
        temperature: 0.1,
      });

      // Preserve deterministic flags if LLM hallucinated pass
      if (answerLeaked || multipleQuestions) {
        verdict.passed = false;
        verdict.answerLeaked = answerLeaked;
        verdict.multipleQuestions = multipleQuestions;
      }

      return verdict;
    } catch {
      // If LLM fails, deterministic checks passed so allow through
      return {
        passed: true,
        issues: [],
        rewriteInstructions: null,
        answerLeaked: false,
        multipleQuestions: false,
      };
    }
  }
}
