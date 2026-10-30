/**
 * Three.js 3D Spatial Skill: Interactive WebGL scenes with blanks.
 */

import { z } from "zod";
import { BaseSkill, VisualOutput } from "../registry";

export const ThreeDSpecSchema = z.object({
  concept: z.string(),
  title: z.string().default("3D Spatial Model"),
  sceneType: z.enum(["matrix_transform", "coordinate_space", "spatial_geometry"]).default("matrix_transform"),
  blankTarget: z.string(),
  predictionPrompt: z.string(),
});

export type ThreeDSpec = z.infer<typeof ThreeDSpecSchema>;

export class ThreeDSkill implements BaseSkill {
  name = "three_d";
  description = "Renders interactive 3D WebGL models for spatial and linear algebra concepts.";
  schema = ThreeDSpecSchema;

  render(spec: ThreeDSpec): VisualOutput {
    return {
      skill: this.name,
      concept: spec.concept,
      visualSpec: spec,
      hasBlanks: true,
      prompt: spec.predictionPrompt,
    };
  }
}
