/**
 * Local Ollama Provider (Free, completely local, zero keys required)
 */

import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export class OllamaProvider implements BaseLLMProvider {
  name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = model || process.env.OLLAMA_MODEL || "llama3";
  }

  async complete(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const formatted = [];
    if (systemPrompt) {
      formatted.push({ role: "system", content: systemPrompt });
    }
    for (const m of messages) {
      formatted.push({ role: m.role, content: m.content });
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: formatted,
          stream: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ollama returned status ${response.status}: ${err}`);
      }

      const data = await response.json();
      return data.message?.content || "";
    } catch (e: any) {
      throw new Error(`Failed to communicate with local Ollama at ${this.baseUrl}: ${e.message}`);
    }
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T> {
    const prompt = `${options.systemPrompt || ""}\n\nYou MUST return valid JSON only.`;
    const raw = await this.complete(messages, prompt);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return options.schema.parse(parsed);
  }
}
