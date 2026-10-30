/**
 * OpenAI Provider implementation using standard fetch API
 */

import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export class OpenAIProvider implements BaseLLMProvider {
  name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = "gpt-4o") {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model;
  }

  async complete(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }
    for (const m of messages) {
      formattedMessages.push({ role: m.role, content: m.content });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T> {
    const promptPrefix = `${options.systemPrompt || ""}\n\nYou MUST respond with ONLY valid JSON. No markdown backticks.`;
    const raw = await this.complete(messages, promptPrefix);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return options.schema.parse(parsed);
  }
}
