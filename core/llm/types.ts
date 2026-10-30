/**
 * Multi-provider LLM Client Abstractions & Types
 */

import { z } from "zod";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StructuredCompletionOptions<T> {
  schema: z.ZodType<T>;
  schemaName?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface BaseLLMProvider {
  name: string;
  complete(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
  completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T>
  ): Promise<T>;
}
