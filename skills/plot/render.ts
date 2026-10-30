/**
 * Plot Skill: Algorithmic complexity and mathematical function plots with blanks.
 */

import { z } from "zod";
import { BaseSkill, VisualOutput } from "../registry";

export const PlotSpecSchema = z.object({
  concept: z.string(),
  plotType: z.enum(["big_o", "gradient_descent", "binary_search", "custom"]).default("big_o"),
  blankTarget: z.string(),
  predictionPrompt: z.string(),
  curves: z
    .array(
      z.object({
        name: z.string(),
        color: z.string(),
        isBlank: z.boolean().default(false),
        points: z.array(z.object({ x: z.number(), y: z.number() })),
      })
    )
    .optional(),
});

export type PlotSpec = z.infer<typeof PlotSpecSchema>;

export class PlotSkill implements BaseSkill {
  name = "plot";
  description = "Renders algorithmic complexity curves and optimization trajectories with blanks.";
  schema = PlotSpecSchema;

  render(spec: PlotSpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.predictionPrompt,
    };
  }
}
