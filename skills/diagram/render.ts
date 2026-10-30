/**
 * Diagram Skill: Mermaid flowcharts and trees with pedagogical blanks.
 */

import { z } from "zod";
import type { BaseSkill, VisualOutput } from "../registry";

export const DiagramSpecSchema = z.object({
  concept: z.string(),
  mermaidSource: z.string(),
  blanks: z.array(z.string()).min(1),
  prompt: z.string(),
});

export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;

export class DiagramSkill implements BaseSkill {
  name = "diagram";
  description = "Renders Mermaid diagrams containing blanks for active learner prediction.";
  schema = DiagramSpecSchema;

  render(spec: DiagramSpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.prompt,
    };
  }
}
