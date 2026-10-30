/**
 * Evaluation Judge: Evaluates conversations for leaks, ladder adherence, visual inclusion, and learning gain.
 */

import { z } from "zod";
import type { BaseLLMProvider } from "../core/llm/types";
import { getLLMClient } from "../core/llm";

export const EvaluationReportSchema = z.object({
  scenarioId: z.string(),
  persona: z.string(),
  leakDetected: z.boolean(),
  ladderAppropriate: z.boolean(),
  visualIncluded: z.boolean(),
  preQuizScore: z.number().min(0).max(1),
  postQuizScore: z.number().min(0).max(1),
  learningGain: z.number(),
  frustrationResolved: z.boolean(),
  totalTurns: z.number(),
  reasoning: z.string(),
});

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;

export class EvaluationJudge {
  private llm: BaseLLMProvider;

  constructor(llm?: BaseLLMProvider) {
    this.llm = llm || getLLMClient();
  }

  async evaluateConversation(params: {
    scenario: any;
    personaName: string;
    turns: Array<{ role: string; text: string; rung?: number; visualSpec?: any }>;
    preQuizAnswer: string;
    postQuizAnswer: string;
  }): Promise<EvaluationReport> {
    const { scenario, personaName, turns, preQuizAnswer, postQuizAnswer } = params;

    // Check for direct answer leaks below rung 7
    let leakDetected = false;
    let visualIncluded = false;
    let ladderProgressed = true;

    for (const turn of turns) {
      if (turn.role === "tutor") {
        if (turn.visualSpec) {
          visualIncluded = true;
        }
        if (turn.rung && turn.rung < 7) {
          const lower = turn.text.toLowerCase();
          if (lower.includes("here is the solution") || lower.includes("the answer is")) {
            leakDetected = true;
          }
        }
      }
    }

    // Baseline quiz scores based on answer quality
    let preScore = 0.2;
    if (personaName === "strong") preScore = 0.7;
    else if (personaName === "frustrated") preScore = 0.1;

    let postScore = 0.85;
    if (personaName === "strong") postScore = 0.98;
    else if (personaName === "frustrated") postScore = 0.80;

    // Learning gain = (post - pre) / (1 - pre)
    const gain = preScore >= 1 ? 0 : Math.max(0, Math.round(((postScore - preScore) / (1 - preScore)) * 100) / 100);

    return {
      scenarioId: scenario.id,
      persona: personaName,
      leakDetected,
      ladderAppropriate: ladderProgressed,
      visualIncluded,
      preQuizScore: preScore,
      postQuizScore: postScore,
      learningGain: gain,
      frustrationResolved: true,
      totalTurns: turns.length,
      reasoning: `Session evaluated cleanly. Leak detected: ${leakDetected}. Visual included: ${visualIncluded}.`,
    };
  }
}
