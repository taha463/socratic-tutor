/**
 * LLM Provider Factory
 */

import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { MockLLMProvider } from "./mock";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import type { BaseLLMProvider } from "./types";

export * from "./types";
export * from "./mock";
export * from "./anthropic";
export * from "./openai";
export * from "./gemini";
export * from "./ollama";

let singletonMock: MockLLMProvider | null = null;

export function getLLMClient(providerName?: string): BaseLLMProvider {
  const chosen = (providerName || process.env.LLM_PROVIDER || "mock").toLowerCase();

  switch (chosen) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    case "mock":
    default:
      if (!singletonMock) {
        singletonMock = new MockLLMProvider();
      }
      return singletonMock;
  }
}
