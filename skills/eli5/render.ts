/**
 * ELI5 Skill: Everyday analogies with mapping questions.
 */

import { z } from "zod";
import type { BaseSkill, VisualOutput } from "../registry";

export const Eli5SpecSchema = z.object({
  concept: z.string(),
  analogy: z.string(),
  mappingQuestion: z.string(),
});

export type Eli5Spec = z.infer<typeof Eli5SpecSchema>;

export class Eli5Skill implements BaseSkill {
  name = "eli5";
  description = "Translates abstract ideas into physical analogies with mapping questions.";
  schema = Eli5SpecSchema;

  render(spec: Eli5Spec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.mappingQuestion,
    };
  }
}
