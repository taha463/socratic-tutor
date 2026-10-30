/**
 * Curriculum Knowledge Store: Curated pedagogical analogies, diagrams, and transfer questions.
 */

import fs from "node:fs";
import path from "node:path";

export interface ConceptCurriculum {
  id: string;
  name: string;
  description: string;
  groundTruth?: string;
  analogies?: Array<{ analogy: string; mappingQuestion: string }>;
  diagrams?: Array<{ mermaidSource: string; blanks: string[]; prompt: string }>;
  traces?: Array<{ code: string; initialVariables: Record<string, any>; predictionPrompt: string; expectedOutput: string }>;
}

export class CurriculumStore {
  private cache: Map<string, ConceptCurriculum> = new Map();

  constructor(curriculumDir?: string) {
    const dir = curriculumDir || path.resolve(process.cwd(), "curriculum");
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), "utf-8");
            const data = JSON.parse(raw);
            const id = data.id || file.replace(".json", "");
            this.cache.set(id.toLowerCase(), data);
          } catch {
            // Ignore malformed files
          }
        }
      }
    }
  }

  getConcept(conceptName: string): ConceptCurriculum | null {
    const key = conceptName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    for (const [id, val] of this.cache.entries()) {
      if (id.includes(key) || key.includes(id)) {
        return val;
      }
    }
    return null;
  }
}
