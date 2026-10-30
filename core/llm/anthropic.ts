/**
 * Anthropic Claude Provider implementation using standard fetch API
 */

import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export class AnthropicProvider implements BaseLLMProvider {
  name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = "claude-3-5-sonnet-20241022") {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = model;
  }

  async complete(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T> {
    const promptPrefix = `${options.systemPrompt || ""}\n\nYou MUST respond with ONLY valid JSON matching this schema. No markdown fences, no explanatory text.`;
    const raw = await this.complete(messages, promptPrefix);
    
    // Clean potential markdown blocks
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return options.schema.parse(parsed);
  }
}
