/**
 * SketchService: Backend service for generating and validating Socratic Sketchboards.
 */

export interface SketchRow {
  row_type: "mapping_pair" | "process_flow" | "annotation_text" | string;
  left_label: string;
  left_box_text: string;
  left_box_color: "pastel_blue" | "pastel_purple" | "none" | string;
  arrow_label: string;
  right_label: string;
  right_box_text: string;
  right_box_color: "pastel_red" | "pastel_green" | "mystery_yellow" | string;
  is_socratic_puzzle: boolean;
  socratic_options: string[];
}

export interface SketchboardDTO {
  board_window_title: string;
  main_heading: string;
  rows: SketchRow[];
  footer_summary: string;
  socratic_voice_prompt: string;
}

export const SKETCHBOARD_JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "socratic_sketchboard",
    strict: true,
    schema: {
      type: "object",
      properties: {
        board_window_title: { type: "string" },
        main_heading: { type: "string" },
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row_type: {
                type: "string",
                enum: ["mapping_pair", "process_flow", "annotation_text"],
              },
              left_label: { type: "string" },
              left_box_text: { type: "string" },
              left_box_color: {
                type: "string",
                enum: ["pastel_blue", "pastel_purple", "none"],
              },
              arrow_label: { type: "string" },
              right_label: { type: "string" },
              right_box_text: { type: "string" },
              right_box_color: {
                type: "string",
                enum: ["pastel_red", "pastel_green", "mystery_yellow"],
              },
              is_socratic_puzzle: { type: "boolean" },
              socratic_options: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "row_type",
              "left_label",
              "left_box_text",
              "left_box_color",
              "arrow_label",
              "right_label",
              "right_box_text",
              "right_box_color",
              "is_socratic_puzzle",
              "socratic_options",
            ],
            additionalProperties: false,
          },
        },
        footer_summary: { type: "string" },
        socratic_voice_prompt: { type: "string" },
      },
      required: [
        "board_window_title",
        "main_heading",
        "rows",
        "footer_summary",
        "socratic_voice_prompt",
      ],
      additionalProperties: false,
    },
  },
};

export class SketchService {
  generateFallbackBoard(concept: string): SketchboardDTO {
    const clean = concept.trim() || "Concept Architecture";
    return {
      board_window_title: `${clean.slice(0, 24)} · Sketchboard`,
      main_heading: `Mental Model: ${clean}`,
      rows: [
        {
          row_type: "mapping_pair",
          left_label: "Input / Source Elements",
          left_box_text: `Raw ${clean} Data`,
          left_box_color: "pastel_blue",
          arrow_label: "Maps via transformation rule",
          right_label: "Intermediate State",
          right_box_text: "Parsed State / Representation",
          right_box_color: "pastel_purple",
          is_socratic_puzzle: false,
          socratic_options: [],
        },
        {
          row_type: "process_flow",
          left_label: "Active Constraint",
          left_box_text: "Core Invariant / Base Case",
          left_box_color: "pastel_purple",
          arrow_label: "What terminates the cycle?",
          right_label: "Socratic Mystery Target",
          right_box_text: "Terminal Condition Met",
          right_box_color: "mystery_yellow",
          is_socratic_puzzle: true,
          socratic_options: [
            "Terminal Condition Met",
            "Infinite Loop Recurrence",
            "Memory Stack Exhaustion",
            "Random Null Pointer",
          ],
        },
        {
          row_type: "mapping_pair",
          left_label: "Derived Output",
          left_box_text: "Synthesized Representation",
          left_box_color: "pastel_blue",
          arrow_label: "Propagates to client layer",
          right_label: "Final Verified Outcome",
          right_box_text: "Complete Mental Model",
          right_box_color: "pastel_green",
          is_socratic_puzzle: false,
          socratic_options: [],
        },
      ],
      footer_summary: `Every ${clean} problem hinges on identifying what changes at each step and what stops the cycle.`,
      socratic_voice_prompt: "Look at the mystery box in row 2. Which outcome must occur to prevent runaway execution?",
    };
  }

  async generateSketchboard(concept: string): Promise<SketchboardDTO> {
    // 1. Try FastAPI backend if running on 8000
    try {
      const fastApiResponse = await fetch("http://127.0.0.1:8000/api/sketch-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept_query: concept }),
        signal: AbortSignal.timeout(1500),
      });

      if (fastApiResponse.ok) {
        return (await fastApiResponse.json()) as SketchboardDTO;
      }
    } catch {
      // Fall through to Groq API
    }

    // 2. Direct Groq Cloud call
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return this.generateFallbackBoard(concept);
    }

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
          reasoning_effort: "medium",
          messages: [
            {
              role: "system",
              content:
                "You are a Visual Hand-Drawn Socratic Tutor. Never use walls of text. " +
                "Deconstruct the student's query into notebook whiteboard rows. " +
                "Always leave the key outcome box as a socratic puzzle (is_socratic_puzzle: true) " +
                "with 3-4 plausible options (socratic_options) including the exact right_box_text, so the student must solve it.",
            },
            { role: "user", content: concept },
          ],
          response_format: SKETCHBOARD_JSON_SCHEMA,
          temperature: 0.2,
        }),
      });

      if (!groqRes.ok) {
        return this.generateFallbackBoard(concept);
      }

      const completion = (await groqRes.json()) as any;
      const rawContent = completion?.choices?.[0]?.message?.content;
      if (!rawContent) return this.generateFallbackBoard(concept);

      return JSON.parse(rawContent) as SketchboardDTO;
    } catch {
      return this.generateFallbackBoard(concept);
    }
  }
}

export const sketchService = new SketchService();

