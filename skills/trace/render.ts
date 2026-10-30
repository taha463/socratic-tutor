/**
 * Trace Skill: Step-by-step code execution tracer with predict-then-reveal flow.
 */

import { z } from "zod";
import { BaseSkill, VisualOutput } from "../registry";

export const TraceStepSchema = z.object({
  line: z.number(),
  callStack: z.array(z.string()),
  variables: z.record(z.any()),
  stdout: z.string().optional(),
});

export const TraceSpecSchema = z.object({
  concept: z.string(),
  code: z.string(),
  language: z.enum(["python", "javascript"]).default("python"),
  predictionPrompt: z.string(),
  expectedOutput: z.string().optional(),
  initialVariables: z.record(z.any()).optional(),
  steps: z.array(TraceStepSchema).optional(),
});

export type TraceSpec = z.infer<typeof TraceSpecSchema>;

export class TraceSkill implements BaseSkill {
  name = "trace";
  description = "Sandboxed code tracer highlighting call stack depth, variables, and line steps with predict-first cards.";
  schema = TraceSpecSchema;

  render(spec: TraceSpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.predictionPrompt,
    };
  }
}
