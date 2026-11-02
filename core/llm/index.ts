/**
 * LLM Provider Factory
 */

import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { MockLLMProvider } from "./mock";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import { getLLMGateway, hasConfiguredRoutes } from "./gateway";
import type { BaseLLMProvider } from "./types";

export * from "./types";
export * from "./mock";
export * from "./anthropic";
export * from "./openai";
export * from "./gemini";
export * from "./ollama";
export * from "./groq";
export * from "./gateway";

let singletonMock: MockLLMProvider | null = null;

/**
 * Resolves the LLM client.
 * - groq / openrouter / gateway (or any GROQ/OPENROUTER key present) -> quota-aware LLMGateway
 *   that routes across every configured Groq + OpenRouter model with cooldowns and fallback.
 * - anthropic / openai / gemini / ollama -> single direct provider.
 * - mock -> deterministic offline provider (tests / no keys).
 */
export function getLLMClient(providerName?: string): BaseLLMProvider {
  let chosen = (providerName || process.env.LLM_PROVIDER || "").toLowerCase();

  if (!chosen || chosen === "mock" && !providerName) {
    if (hasConfiguredRoutes()) {
      chosen = "gateway";
    } else if (process.env.GEMINI_API_KEY) {
      chosen = "gemini";
    } else if (process.env.OPENAI_API_KEY) {
      chosen = "openai";
    } else if (process.env.ANTHROPIC_API_KEY) {
      chosen = "anthropic";
    } else {
      chosen = "mock";
    }
  }

  switch (chosen) {
    case "groq":
    case "openrouter":
    case "gateway":
      if (hasConfiguredRoutes()) return getLLMGateway();
      return getLLMClient("mock");
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
