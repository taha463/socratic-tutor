/**
 * Visualizer Agent: Selects visual modality and generates visual spec with blanks.
 */

import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { BaseLLMProvider, ChatMessage } from "../llm/types";
import { getLLMClient } from "../llm";
import { CurriculumStore } from "../../curriculum/store";

export const VisualizerDecisionSchema = z.object({
  chosenSkill: z.enum(["diagram", "trace", "eli5", "analogy", "plot", "animate", "three_d"]),
  concept: z.string(),
  visualSpec: z.record(z.any()),
  reasoning: z.string(),
});

export type VisualizerDecision = z.infer<typeof VisualizerDecisionSchema>;

export class VisualizerAgent {
  private basePrompt: string;
  private llm: BaseLLMProvider;
  private curriculum: CurriculumStore;

  constructor(llm?: BaseLLMProvider, curriculum?: CurriculumStore) {
    this.llm = llm || getLLMClient();
    this.curriculum = curriculum || new CurriculumStore();
    const promptPath = path.resolve(process.cwd(), "core/agents/prompts/visualizer.txt");
    this.basePrompt = fs.readFileSync(promptPath, "utf-8");
  }

  async decide(params: {
    concept: string;
    skillType?: string | null;
    rung?: number;
    learnerLevel?: string;
    whatToHide?: string | null;
    factualContext?: string | null;
  }): Promise<VisualizerDecision> {
    const { concept, skillType, rung = 4, learnerLevel = "beginner", whatToHide, factualContext } = params;

    // 1. Check curriculum store for pre-tested template
    const curated = this.curriculum.getConcept(concept);
    if (curated) {
      if ((skillType === "diagram" || (!skillType && rung === 4)) && curated.diagrams?.length) {
        const diag = curated.diagrams[0];
        return {
          chosenSkill: "diagram",
          concept,
          visualSpec: {
            concept,
            mermaidSource: diag.mermaidSource,
            blanks: diag.blanks,
            prompt: diag.prompt,
          },
          reasoning: `Curated diagram for ${concept} with blanks.`,
        };
      }

      if ((skillType === "trace" || (!skillType && concept.includes("code"))) && curated.traces?.length) {
        const tr = curated.traces[0];
        return {
          chosenSkill: "trace",
          concept,
          visualSpec: {
            concept,
            code: tr.code,
            initialVariables: tr.initialVariables,
            predictionPrompt: tr.predictionPrompt,
            expectedOutput: tr.expectedOutput,
          },
          reasoning: `Curated trace for ${concept} with predict-first flow.`,
        };
      }

      if (skillType === "eli5" || skillType === "analogy" || (!skillType && curated.analogies?.length)) {
        const an = curated.analogies?.[0];
        if (an) {
          return {
            chosenSkill: "analogy",
            concept,
            visualSpec: {
              concept,
              analogy: an.analogy,
              mappingQuestion: an.mappingQuestion,
            },
            reasoning: `Curated analogy for ${concept}.`,
          };
        }
      }
    }

    // 2. Fall back to LLM visual design
    let systemPrompt = `${this.basePrompt}

REQUEST CONSTRAINTS:
- Concept to Visualize: ${concept}
- Preferred Skill Type: ${skillType || "Agent Choice"}
- Target Ladder Rung: Rung ${rung}
- Learner Level: ${learnerLevel}
- Element to Mask/Hide: ${whatToHide || "Final invariant / answer"}`;

    if (factualContext) {
      systemPrompt += `\n- Technical/Factual Context: ${factualContext}`;
    }

    const messages: ChatMessage[] = [
      { role: "user", content: `Design a visual scaffold for "${concept}". Ensure at least one blank or prediction prompt.` },
    ];

    try {
      return await this.llm.completeStructured(messages, {
        schema: VisualizerDecisionSchema,
        schemaName: "VisualizerDecision",
        systemPrompt,
        temperature: 0.2,
      });
    } catch {
      return {
        chosenSkill: (skillType as any) || "eli5",
        concept,
        visualSpec: {
          concept,
          analogy: `Think of ${concept} like a chain of dependent actions.`,
          mappingQuestion: "What must happen at the very beginning to kick off the chain?",
        },
        reasoning: "Fallback everyday analogy.",
      };
    }
  }
}
