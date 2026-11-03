/**
 * Groq LLM Provider
 * High-speed inference provider using Groq's OpenAI-compatible API
 */

import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export class GroqProvider implements BaseLLMProvider {
  name = "groq";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    // Default to openai/gpt-oss-120b or openai/gpt-oss-20b which are live and supported on user's Groq tier
    this.model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    this.baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  }

  async complete(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not configured.");
    }

    const formattedMessages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }

    for (const m of messages) {
      formattedMessages.push({ role: m.role, content: m.content });
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const fallbackModels = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"].filter(
        (m) => m !== this.model
      );
      for (const fallbackModel of fallbackModels) {
        console.warn(`[GroqProvider] Primary model ${this.model} error (${res.status}), cascading fallback to ${fallbackModel}`);
        try {
          const fallbackRes = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: fallbackModel,
              messages: formattedMessages,
              temperature: 0.3,
              max_tokens: 1024,
            }),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            return fallbackData?.choices?.[0]?.message?.content || "";
          }
        } catch {
          continue;
        }
      }
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T> {
    const systemPromptWithSchema = `${options.systemPrompt || ""}\n\nYou MUST respond with valid JSON matching this schema: ${options.schemaName}.\nDo not include code fences or markdown blocks. Return ONLY the raw JSON object.`;

    const rawResponse = await this.complete(messages, systemPromptWithSchema);

    // Clean any accidental markdown code fences
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);
      return options.schema.parse(parsed);
    } catch (e) {
      // Try to find first { and last }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        let extracted = cleaned.substring(firstBrace, lastBrace + 1);
        extracted = extracted.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(extracted);
        return options.schema.parse(parsed);
      }
      throw new Error(
        `Failed to parse structured response from Groq: ${e instanceof Error ? e.message : String(e)}. Raw text: ${cleaned}`
      );
    }
  }
}

