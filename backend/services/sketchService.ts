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
              },
              left_label: { type: "string" },
              left_box_text: { type: "string" },
              left_box_color: {
                type: "string",
              },
              arrow_label: { type: "string" },
              right_label: { type: "string" },
              right_box_text: { type: "string" },
              right_box_color: {
                type: "string",
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
  private cache = new Map<string, { data: SketchboardDTO; timestamp: number }>();
  private inFlight = new Map<string, Promise<SketchboardDTO>>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

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
    const clean = concept.trim() || "Concept Architecture";
    const cacheKey = clean.toLowerCase();

    // 1. Check in-memory cache
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < this.TTL_MS) {
      return cached.data;
    }

    // 2. In-flight request deduplication
    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey)!;
    }

    const task = (async (): Promise<SketchboardDTO> => {
      // Step A: Try FastAPI backend on 8000 if available
      try {
        const fastApiResponse = await fetch("http://127.0.0.1:8000/api/sketch-tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept_query: clean }),
          signal: AbortSignal.timeout(1500),
        });

        if (fastApiResponse.ok) {
          const result = (await fastApiResponse.json()) as SketchboardDTO;
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch {
        // Fall through to Groq API cascade
      }

      // Step B: Direct Groq Cloud call with multi-model cascade
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const preferredModel = (process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim();
        const candidates = [
          preferredModel,
          "openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-120b",
        ];
        const modelsToTry = Array.from(new Set(candidates.filter(Boolean)));

        for (const model of modelsToTry) {
          try {
            const bodyPayload: Record<string, any> = {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a Visual Hand-Drawn Socratic Tutor. Never use walls of text. " +
                    "Deconstruct the student's query into notebook whiteboard rows. " +
                    "Always leave the key outcome box as a socratic puzzle (is_socratic_puzzle: true) " +
                    "with 3-4 plausible options (socratic_options) including the exact right_box_text, so the student must solve it.",
                },
                { role: "user", content: clean },
              ],
              response_format: SKETCHBOARD_JSON_SCHEMA,
              temperature: 0.2,
            };

            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${groqKey}`,
              },
              body: JSON.stringify(bodyPayload),
            });

            if (!groqRes.ok) {
              const errStatus = groqRes.status;
              const errText = await groqRes.text();
              console.warn(`[SketchService] Groq model ${model} failed (${errStatus}): ${errText.slice(0, 150)}. Cascading...`);
              continue;
            }

            const completion = (await groqRes.json()) as any;
            const rawContent = completion?.choices?.[0]?.message?.content;
            if (!rawContent) continue;

            const parsed = JSON.parse(rawContent) as SketchboardDTO;
            this.cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
            return parsed;
          } catch (err: any) {
            console.warn(`[SketchService] Groq model ${model} error: ${err?.message || err}. Trying next...`);
            continue;
          }
        }
      }

      // Step C: OpenRouter fallback cascade
      const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
      if (openRouterKey) {
        const orModels = [
          (process.env.OPENROUTER_MODEL || process.env.OPEN_ROUTER_MODEL || "").trim(),
          "dots-studio/dots-3-note-preview:free",
          "nvidia/nemotron-3.5-lightning:free",
          "meta-llama/llama-3.3-70b-instruct:free",
          "google/gemma-4-31b-it:free",
        ].filter(Boolean);

        for (const model of orModels) {
          try {
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openRouterKey}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Socratic Tutor",
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a Visual Hand-Drawn Socratic Tutor. Output strictly valid JSON matching this schema:\n" +
                      JSON.stringify(SKETCHBOARD_JSON_SCHEMA.json_schema.schema) +
                      "\nEnsure at least one row has is_socratic_puzzle: true and 3-4 socratic_options.",
                  },
                  { role: "user", content: `Visual sketchboard for: ${clean}` },
                ],
                response_format: { type: "json_object" },
                temperature: 0.2,
              }),
            });

            if (!orRes.ok) continue;

            const orData = (await orRes.json()) as any;
            const msg = orData?.choices?.[0]?.message;
            let raw = msg?.content || msg?.reasoning || "";
            if (raw.includes("```json")) {
              raw = raw.split("```json")[1].split("```")[0].trim();
            } else if (raw.includes("```")) {
              raw = raw.split("```")[1].split("```")[0].trim();
            }
            if (raw) {
              const parsed = JSON.parse(raw) as SketchboardDTO;
              if (parsed && Array.isArray(parsed.rows) && parsed.rows.length >= 1) {
                this.cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
                return parsed;
              }
            }
          } catch (err: any) {
            console.warn(`[SketchService] OpenRouter model ${model} error: ${err?.message || err}`);
            continue;
          }
        }
      }

      // Step D: Dynamic algorithmic board if external APIs are unavailable
      const fallback = this.generateFallbackBoard(clean);
      this.cache.set(cacheKey, { data: fallback, timestamp: Date.now() });
      return fallback;
    })();

    this.inFlight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }
}

export const sketchService = new SketchService();

