/**
 * Analogy Skill: Curated mental models with transfer questions.
 */

import { z } from "zod";
import type { BaseSkill, VisualOutput } from "../registry";

export const AnalogySpecSchema = z.object({
  concept: z.string(),
  analogy: z.string(),
  mappingQuestion: z.string(),
  transferConcept: z.string().optional(),
});

export type AnalogySpec = z.infer<typeof AnalogySpecSchema>;

export class AnalogySkill implements BaseSkill {
  name = "analogy";
  description = "Renders tested pedagogical analogies from the curriculum library.";
  schema = AnalogySpecSchema;

  render(spec: AnalogySpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.mappingQuestion,
    };
  }
}
