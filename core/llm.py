"""Multi-provider LLM client for Socratic Tutor v2.

Supports Mock (default for tests/CI), Anthropic (default for live), Gemini, and OpenAI.
All external network providers use standard HTTP calls via httpx to eliminate heavy SDKs.
"""

from __future__ import annotations

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    """Normalized response from an LLM call."""
    content: str
    model: str
    provider: str
    raw: Optional[Dict[str, Any]] = None


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def complete(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Generate a text completion given messages and an optional system prompt."""
        pass

    def complete_structured(
        self,
        schema: Type[T],
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> T:
        """Generate a completion and validate it against a Pydantic schema."""
        # Check if provider is MockLLMProvider and has schema-aware generation
        if isinstance(self, MockLLMProvider):
            resp = self.complete_for_schema(schema, messages, system, temperature, max_tokens)
        else:
            system_suffix = (
                f"\n\nYou must respond strictly with valid JSON conforming to the following schema:\n"
                f"{json.dumps(schema.model_json_schema(), indent=2)}\n"
                f"Do not include markdown code block backticks (like ```json), just the raw JSON object."
            )
            full_system = (system or "") + system_suffix
            resp = self.complete(
                messages=messages,
                system=full_system,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        text = resp.content.strip()
        # Clean potential markdown wrapping if returned by LLM
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        try:
            data = json.loads(text)
            return schema.model_validate(data)
        except Exception as e:
            logger.error("Failed to parse JSON for schema %s from text: %s", schema.__name__, text)
            raise ValueError(f"Failed to parse structured LLM response into {schema.__name__}: {e}\nRaw output: {text}") from e


class MockLLMProvider(BaseLLMProvider):
    """Deterministic mock provider for CI, offline testing, and reproducibility.

    Can be programmed with a queue of responses or generate context-aware defaults.
    """

    def __init__(self, default_response: Optional[str] = None) -> None:
        self.default_response = default_response
        self.response_queue: List[str] = []
        self.call_history: List[Dict[str, Any]] = []

    def enqueue_response(self, text_or_data: str | Dict[str, Any] | BaseModel) -> None:
        """Enqueue a canned response to be returned by next completion call."""
        if isinstance(text_or_data, BaseModel):
            self.response_queue.append(text_or_data.model_dump_json())
        elif isinstance(text_or_data, dict):
            self.response_queue.append(json.dumps(text_or_data))
        else:
            self.response_queue.append(str(text_or_data))

    def complete_for_schema(
        self,
        schema: Type[T],
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Generate response tailored for a requested schema."""
        self.call_history.append({
            "schema": schema.__name__,
            "messages": messages,
            "system": system,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })

        # Check if there is an item in the queue that matches this schema
        for i, item in enumerate(self.response_queue):
            try:
                # Test if valid JSON that parses into this schema
                parsed = json.loads(item)
                schema.model_validate(parsed)
                # Matches! Pop this item
                return LLMResponse(content=self.response_queue.pop(i), model="mock-model", provider="mock")
            except Exception:
                continue

        # If not matching queued items, generate contextual default for this schema
        content = self._generate_contextual_mock(messages, system, target_schema_name=schema.__name__)
        return LLMResponse(content=content, model="mock-model", provider="mock")

    def complete(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        self.call_history.append({
            "messages": messages,
            "system": system,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })

        if self.response_queue:
            content = self.response_queue.pop(0)
            return LLMResponse(content=content, model="mock-model", provider="mock")

        if self.default_response:
            return LLMResponse(content=self.default_response, model="mock-model", provider="mock")

        # Context-aware default based on system prompt / messages
        content = self._generate_contextual_mock(messages, system)
        return LLMResponse(content=content, model="mock-model", provider="mock")

    def _generate_contextual_mock(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str],
        target_schema_name: Optional[str] = None,
    ) -> str:
        prompt_str = ((system or "") + " " + " ".join(m.get("content", "") for m in messages)).lower()
        user_text = " ".join(m.get("content", "") for m in messages).lower()

        # 1. Prioritize explicit target schema if provided
        if target_schema_name == "TeacherDraft":
            return json.dumps({
                "reply_text": "What do you think happens when a function calls itself?",
                "single_question": "What do you think happens when a function calls itself?",
                "needs_visual": False,
                "visual_concept": None,
                "visual_type": None,
            })

        if target_schema_name == "CriticVerdict":
            if (
                "the answer is" in user_text
                or "here is the code:" in user_text
                or "solution:" in user_text
                or "here is the solution" in user_text
                or "you can solve this by writing:" in user_text
            ):
                return json.dumps({
                    "passed": False,
                    "issues": ["Draft provides direct answer instead of guiding the learner."],
                    "leak_detected": True,
                    "multiple_questions": False,
                    "code_dump": False,
                    "rewrite_instructions": "Remove the solution. Ask a single question about the base case.",
                })
            if user_text.count("?") > 1:
                return json.dumps({
                    "passed": False,
                    "issues": ["Draft asks multiple questions in a single turn."],
                    "leak_detected": False,
                    "multiple_questions": True,
                    "code_dump": False,
                    "rewrite_instructions": "Consolidate into exactly one focused question.",
                })
            return json.dumps({
                "passed": True,
                "issues": [],
                "leak_detected": False,
                "multiple_questions": False,
                "code_dump": False,
                "rewrite_instructions": "",
            })

        if target_schema_name == "DiagnosticResult" or "diagnostician" in prompt_str or '"recommended_rung"' in prompt_str:
            if "paste" in user_text or "copier" in user_text:
                return json.dumps({
                    "level": "intermediate",
                    "frustration": 0.1,
                    "state": "COPYING_SUSPECTED",
                    "recommended_rung": 1,
                    "reasoning": "Large unformatted paste detected; probe for conceptual understanding.",
                })
            elif "stuck" in user_text or "i don't get it" in user_text or "confused" in user_text:
                return json.dumps({
                    "level": "beginner",
                    "frustration": 0.75,
                    "state": "STUCK",
                    "recommended_rung": 4,
                    "reasoning": "Learner expressed confusion; stepping up to visual explanation.",
                })
            elif "mastery" in user_text or "got it" in user_text:
                return json.dumps({
                    "level": "advanced",
                    "frustration": 0.0,
                    "state": "MASTERY",
                    "recommended_rung": 1,
                    "reasoning": "Learner demonstrated mastery of the core concept.",
                })
            else:
                return json.dumps({
                    "level": "beginner",
                    "frustration": 0.2,
                    "state": "LEARNING",
                    "recommended_rung": 1,
                    "reasoning": "Initial inquiry; probing prior knowledge.",
                })

        if target_schema_name == "VisualizerDecision":
            if "trace" in prompt_str or "code" in prompt_str:
                return json.dumps({
                    "chosen_skill": "trace",
                    "concept": "recursion",
                    "visual_spec": {
                        "code": "def countdown(n):\n    if n <= 0: return\n    print(n)\n    countdown(n - 1)",
                        "prediction_prompt": "What gets printed first when countdown(3) is called?",
                    },
                    "reasoning": "Execution trace helps visualize call stack frames.",
                })
            elif "hierarchy" in prompt_str or "tree" in prompt_str or "flow" in prompt_str:
                return json.dumps({
                    "chosen_skill": "diagram",
                    "concept": "binary-tree",
                    "visual_spec": {
                        "mermaid_source": "graph TD\n    A[Root: 10] --> B[Left: 5]\n    A --> C[Right: ?BLANK?]",
                        "blanks": ["?BLANK?"],
                        "prompt": "If elements greater than 10 go to the right, what belongs in ?BLANK?",
                    },
                    "reasoning": "Mermaid diagram with blanks tests BST invariant.",
                })
            else:
                return json.dumps({
                    "chosen_skill": "eli5",
                    "concept": "general",
                    "visual_spec": {
                        "analogy": "Imagine a stack of plates at a buffet.",
                        "mapping_question": "Which plate do you remove first: the top one or the bottom one?",
                    },
                    "reasoning": "Physical everyday analogy helps ground abstract logic.",
                })

        if target_schema_name == "LeakVerdict":
            has_leak = "the answer is" in user_text or "here is the solution" in user_text
            return json.dumps({
                "leak_detected": has_leak,
                "leak_score": 1.0 if has_leak else 0.0,
                "pedagogical_value": 0.3 if has_leak else 0.9,
                "reasoning": "Direct solution leaked." if has_leak else "Pedagogically sound Socratic guidance.",
            })

        if target_schema_name == "QuizScore":
            if "no idea" in user_text or "not sure" in user_text or "copy and paste" in user_text:
                score = 0.25
            elif "stops" in user_text or "base" in user_text or "condition" in user_text or "invariant" in user_text:
                score = 0.90
            else:
                score = 0.65
            return json.dumps({
                "score": score,
                "rationale": "Conceptually assessed against expected ground truth rubric.",
            })

        # 2. Fallbacks based on message content
        if "critic" in prompt_str or '"passed"' in prompt_str:
            return json.dumps({
                "passed": True,
                "issues": [],
                "leak_detected": False,
                "multiple_questions": False,
                "code_dump": False,
                "rewrite_instructions": "",
            })

        if "teacher" in prompt_str or '"reply_text"' in prompt_str:
            return json.dumps({
                "reply_text": "What do you think happens when a function calls itself?",
                "single_question": "What do you think happens when a function calls itself?",
                "needs_visual": False,
                "visual_concept": None,
                "visual_type": None,
            })

        # Eval Judge request
        if "eval judge" in prompt_str or '"leak_score"' in prompt_str:
            return json.dumps({
                "leak_score": 0.0,
                "leak_detected": False,
                "pedagogical_value": 0.9,
                "reasoning": "Tutor guided student through Socratic questioning without revealing the final answer.",
            })

        # Simulated Persona request
        if "persona" in prompt_str or "simulated student" in prompt_str:
            if "frustrated" in prompt_str:
                return "I still don't get this at all! Can you just tell me how to do it?"
            elif "copier" in prompt_str:
                return "Just write the python code for me please."
            elif "strong" in prompt_str:
                return "I think the base case stops infinite recursion when n equals 0. What happens to the return values?"
            else:
                return "I think it has something to do with calling the same function again?"

        # Default fallback
        return "What do you think happens to a function call while it waits for another function to complete?"


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider using direct HTTP."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set.")
        self.model = model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

    def complete(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system:
            payload["system"] = system

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["content"][0]["text"]
            return LLMResponse(content=content, model=self.model, provider="anthropic", raw=data)


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider using direct HTTP."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def complete(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        contents = []
        for m in messages:
            role = "user" if m.get("role") in ("user", "learner") else "model"
            contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            parts = data["candidates"][0]["content"]["parts"]
            content = "".join(p.get("text", "") for p in parts)
            return LLMResponse(content=content, model=self.model, provider="gemini", raw=data)


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider using direct HTTP."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def complete(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        formatted_messages = []
        if system:
            formatted_messages.append({"role": "system", "content": system})
        for m in messages:
            role = "user" if m.get("role") in ("user", "learner") else "assistant"
            formatted_messages.append({"role": role, "content": m.get("content", "")})

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return LLMResponse(content=content, model=self.model, provider="openai", raw=data)


def get_llm_client(provider: Optional[str] = None) -> BaseLLMProvider:
    """Factory to retrieve the configured LLM provider.

    Resolution order:
    1. Explicit parameter.
    2. Environment variable LLM_PROVIDER.
    3. Auto-detected from available API keys (ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY).
    4. Fallback to MockLLMProvider.
    """
    chosen = (provider or os.getenv("LLM_PROVIDER", "")).strip().lower()

    if chosen == "mock":
        return MockLLMProvider()
    elif chosen == "anthropic":
        return AnthropicProvider()
    elif chosen == "gemini":
        return GeminiProvider()
    elif chosen == "openai":
        return OpenAIProvider()

    # If unspecified, inspect keys
    if os.getenv("ANTHROPIC_API_KEY"):
        return AnthropicProvider()
    if os.getenv("GEMINI_API_KEY"):
        return GeminiProvider()
    if os.getenv("OPENAI_API_KEY"):
        return OpenAIProvider()

    # Default to mock provider for safe offline operation
    return MockLLMProvider()
