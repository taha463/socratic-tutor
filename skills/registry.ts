/**
 * Visual Skills Registry & Schema Validation Engine
 */

import { z } from "zod";
import { Eli5Skill } from "./eli5/render";
import { DiagramSkill } from "./diagram/render";
import { AnalogySkill } from "./analogy/render";
import { PlotSkill } from "./plot/render";
import { AnimateSkill } from "./animate/render";
import { ThreeDSkill } from "./three_d/render";
import { TraceSkill } from "./trace/render";

export interface VisualOutput {
  skill: string;
  concept: string;
  visualSpec: Record<string, any>;
  hasBlanks: boolean;
  prompt?: string;
  metadata?: Record<string, any>;
}

export interface BaseSkill {
  name: string;
  description: string;
  schema: z.ZodType<any>;
  render(spec: Record<string, any>): VisualOutput;
}

export class SkillRegistry {
  private skills: Map<string, BaseSkill> = new Map();

  register(skill: BaseSkill): void {
    this.skills.set(skill.name.toLowerCase(), skill);
  }

  get(name: string): BaseSkill | undefined {
    return this.skills.get(name.toLowerCase());
  }

  list(): string[] {
    return Array.from(this.skills.keys());
  }

  render(skillName: string, spec: Record<string, any>): VisualOutput {
    const skill = this.get(skillName);
    if (!skill) {
      throw new Error(`Skill "${skillName}" is not registered. Available: ${this.list().join(", ")}`);
    }

    // Validate against skill zod schema
    const validatedSpec = skill.schema.parse(spec);
    return skill.render(validatedSpec);
  }
}

let globalRegistry: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry();
    globalRegistry.register(new Eli5Skill());
    globalRegistry.register(new DiagramSkill());
    globalRegistry.register(new AnalogySkill());
    globalRegistry.register(new PlotSkill());
    globalRegistry.register(new AnimateSkill());
    globalRegistry.register(new ThreeDSkill());
    globalRegistry.register(new TraceSkill());
  }
  return globalRegistry;
}
