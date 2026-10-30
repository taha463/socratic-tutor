/**
 * Animate Skill: Browser-native step-animation player driven by JSON scenes.
 */

import { z } from "zod";
import { BaseSkill, VisualOutput } from "../registry";

export const AnimateElementSchema = z.object({
  id: z.string(),
  type: z.enum(["box", "circle", "arrow", "text", "stack_frame"]),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
  highlight: z.boolean().default(false),
  isBlank: z.boolean().default(false),
});

export const AnimateStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  description: z.string(),
  codeLineHighlight: z.number().optional(),
  elements: z.array(AnimateElementSchema),
});

export const AnimateSpecSchema = z.object({
  concept: z.string(),
  title: z.string(),
  steps: z.array(AnimateStepSchema).min(1),
  predictionPrompt: z.string(),
  blankStepIndex: z.number().default(1),
});

export type AnimateSpec = z.infer<typeof AnimateSpecSchema>;

export class AnimateSkill implements BaseSkill {
  name = "animate";
  description = "Renders multi-step browser animations with playback controls and prediction stops.";
  schema = AnimateSpecSchema;

  render(spec: AnimateSpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.predictionPrompt,
    };
  }
}
