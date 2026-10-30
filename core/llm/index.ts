/**
 * LLM Provider Factory
 */

import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
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
export * from "./groq";

let singletonMock: MockLLMProvider | null = null;

export function getLLMClient(providerName?: string): BaseLLMProvider {
  // If provider is explicitly specified, use it
  let chosen = (providerName || process.env.LLM_PROVIDER || "").toLowerCase();

  // If not explicitly set or set to mock, check if user provided keys in environment
  if (!chosen || chosen === "mock") {
    if (process.env.GROQ_API_KEY) {
      chosen = "groq";
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
      return new GroqProvider();
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
