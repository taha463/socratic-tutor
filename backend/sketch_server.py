"""
SketchSocratic FastAPI Backend
Provides strict JSON schema-constrained Socratic Sketchboard generation via Groq openai/gpt-oss-120b.
"""

import os
import json
import time
import urllib.request
import urllib.error
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

# Load environment variable if not already set in os.environ
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if not line_str or line_str.startswith("#") or "=" not in line_str:
                continue
            k, v = line_str.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and not os.environ.get(k):
                os.environ[k] = v

app = FastAPI(
    title="SketchSocratic Backend",
    description="Visual Hand-Drawn Socratic AI Tutor with Strict Whiteboard Schema",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory LRU/TTL cache to prevent Groq TPM rate limits and provide instant repeat responses
_sketchboard_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

sketchboard_schema = {
    "type": "json_schema",
    "json_schema": {
        "name": "socratic_sketchboard",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "board_window_title": {"type": "string"},
                "main_heading": {"type": "string"},
                "rows": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "row_type": {
                                "type": "string"
                            },
                            "left_label": {"type": "string"},
                            "left_box_text": {"type": "string"},
                            "left_box_color": {"type": "string"},
                            "arrow_label": {"type": "string"},
                            "right_label": {"type": "string"},
                            "right_box_text": {"type": "string"},
                            "right_box_color": {"type": "string"},
                            "is_socratic_puzzle": {"type": "boolean"},
                            "socratic_options": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": [
                            "row_type", "left_label", "left_box_text", "left_box_color",
                            "arrow_label", "right_label", "right_box_text", "right_box_color",
                            "is_socratic_puzzle", "socratic_options"
                        ],
                        "additionalProperties": False
                    }
                },
                "footer_summary": {"type": "string"},
                "socratic_voice_prompt": {"type": "string"}
            },
            "required": [
                "board_window_title", "main_heading", "rows", 
                "footer_summary", "socratic_voice_prompt"
            ],
            "additionalProperties": False
        }
    }
}

class TutorRequest(BaseModel):
    concept_query: str

class SketchRow(BaseModel):
    row_type: str
    left_label: str
    left_box_text: str
    left_box_color: str
    arrow_label: str
    right_label: str
    right_box_text: str
    right_box_color: str
    is_socratic_puzzle: bool
    socratic_options: List[str]

class SketchboardResponse(BaseModel):
    board_window_title: str
    main_heading: str
    rows: List[SketchRow]
    footer_summary: str
    socratic_voice_prompt: str

@app.get("/health")
def health_check():
    has_groq = bool(os.environ.get("GROQ_API_KEY"))
    has_openrouter = bool(os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY"))
    return {
        "status": "ok",
        "service": "SketchSocratic",
        "groq_configured": has_groq,
        "openrouter_configured": has_openrouter,
    }

def get_cascading_models() -> List[str]:
    """Builds prioritized list of models with high TPM and automatic fallback."""
    preferred = (os.environ.get("GROQ_MODEL") or "openai/gpt-oss-20b").strip()
    candidates = [
        preferred,
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
    ]
    seen = set()
    result = []
    for m in candidates:
        if m and m not in seen:
            seen.add(m)
            result.append(m)
    return result

def query_openrouter_sketch(query: str, api_key: str) -> Optional[dict]:
    """Fallback to OpenRouter free models if Groq is fully rate-limited."""
    preferred = (os.environ.get("OPENROUTER_MODEL") or os.environ.get("OPEN_ROUTER_MODEL") or "").strip()
    models = [
        preferred,
        "dots-studio/dots-3-note-preview:free",
        "nvidia/nemotron-3.5-lightning:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemma-4-31b-it:free",
    ]
    models = [m for m in models if m]

    system_instruction = (
        "You are a Visual Hand-Drawn Socratic Tutor. Output strictly valid JSON matching this schema:\n"
        "{\n"
        '  "board_window_title": string,\n'
        '  "main_heading": string,\n'
        '  "rows": [\n'
        '    {\n'
        '      "row_type": "mapping_pair" | "process_flow",\n'
        '      "left_label": string,\n'
        '      "left_box_text": string,\n'
        '      "left_box_color": string,\n'
        '      "arrow_label": string,\n'
        '      "right_label": string,\n'
        '      "right_box_text": string,\n'
        '      "right_box_color": string,\n'
        '      "is_socratic_puzzle": boolean,\n'
        '      "socratic_options": string[]\n'
        "    }\n"
        "  ],\n"
        '  "footer_summary": string,\n'
        '  "socratic_voice_prompt": string\n'
        "}\n"
        "At least one row MUST have is_socratic_puzzle: true with 3-4 socratic_options containing right_box_text."
    )

    for model in models:
        try:
            req_data = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": f"Create Socratic sketchboard for: {query}"}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(req_data).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Socratic Tutor"
                }
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                raw = json.loads(res.read().decode("utf-8"))
                choice = raw.get("choices", [{}])[0].get("message", {})
                content = choice.get("content") or choice.get("reasoning") or ""
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                data = json.loads(content)
                if isinstance(data, dict) and "rows" in data and len(data["rows"]) >= 1:
                    print(f"[SketchServer] OpenRouter successfully generated whiteboard using model {model}.")
                    return data
        except Exception as e:
            print(f"[SketchServer] OpenRouter model {model} failed: {e}. Trying next...")
            continue
    return None

@app.post("/api/sketch-tutor", response_model=SketchboardResponse)
def generate_sketch_tutor(req: TutorRequest):
    query = req.concept_query.strip()
    cache_key = query.lower()

    # 1. Check in-memory cache
    now = time.time()
    if cache_key in _sketchboard_cache:
        cached = _sketchboard_cache[cache_key]
        if now - cached["ts"] < CACHE_TTL_SECONDS:
            return cached["data"]

    groq_api_key = os.environ.get("GROQ_API_KEY")
    openrouter_api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY")

    if groq_api_key:
        client = Groq(api_key=groq_api_key)
        models_to_try = get_cascading_models()

        for model in models_to_try:
            try:
                kwargs = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a Visual Hand-Drawn Socratic Tutor. Never use walls of text. "
                                "Deconstruct the student query into notebook whiteboard rows. "
                                "Always leave the key outcome box as a socratic puzzle (is_socratic_puzzle: true) "
                                "with 3-4 plausible multiple-choice options (socratic_options) including the exact right_box_text, "
                                "so the student must solve it."
                            )
                        },
                        {"role": "user", "content": query}
                    ],
                    "response_format": sketchboard_schema,
                    "temperature": 0.2
                }
                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                data = json.loads(content)

                # Store in cache
                _sketchboard_cache[cache_key] = {"data": data, "ts": now}
                return data
            except Exception as e:
                err_msg = str(e)
                if "rate_limit" in err_msg.lower() or "429" in err_msg or "tokens" in err_msg:
                    print(f"[SketchServer] Model {model} rate limited (429). Auto-failing over to next model in cascade...")
                    continue
                else:
                    print(f"[SketchServer] Model {model} returned error ({e}). Trying next model...")
                    continue

    # Fallback to OpenRouter if Groq is rate-limited or unconfigured
    if openrouter_api_key:
        print("[SketchServer] Groq unavailable/rate-limited. Attempting OpenRouter fallback cascade...")
        or_data = query_openrouter_sketch(query, openrouter_api_key)
        if or_data:
            _sketchboard_cache[cache_key] = {"data": or_data, "ts": now}
            return or_data

    # If all models in cascade fail or are rate-limited, safely return dynamic algorithmic fallback
    print(f"[SketchServer] All cloud models temporarily unavailable. Returning dynamic algorithmic Socratic board.")
    fallback = generate_fallback_whiteboard(query)
    _sketchboard_cache[cache_key] = {"data": fallback, "ts": now}
    return fallback

def generate_fallback_whiteboard(concept: str) -> dict:
    """Generates a dynamic 80/20 Socratic whiteboard if external API is temporarily unavailable."""
    clean = concept.strip() or "Core Mental Model"
    return {
        "board_window_title": f"{clean[:24]} · Sketchboard",
        "main_heading": f"Mapping the Mental Model: {clean}",
        "rows": [
            {
                "row_type": "mapping_pair",
                "left_label": "Input / Concept Seed",
                "left_box_text": f"Raw {clean} Input",
                "left_box_color": "pastel_blue",
                "arrow_label": "Transforms via core rule",
                "right_label": "Intermediate State",
                "right_box_text": "Sub-problem Representation",
                "right_box_color": "pastel_purple",
                "is_socratic_puzzle": False,
                "socratic_options": []
            },
            {
                "row_type": "process_flow",
                "left_label": "Active Constraint",
                "left_box_text": "Base condition / Invariant",
                "left_box_color": "pastel_purple",
                "arrow_label": "When invariant holds?",
                "right_label": "Key Socratic Target",
                "right_box_text": "Terminal Return Value",
                "right_box_color": "mystery_yellow",
                "is_socratic_puzzle": True,
                "socratic_options": [
                    "Terminal Return Value",
                    "Unbounded Infinite Loop",
                    "Memory Stack Overflow",
                    "Discard Computation"
                ]
            },
            {
                "row_type": "mapping_pair",
                "left_label": "Synthesized Output",
                "left_box_text": "Accumulated Result",
                "left_box_color": "pastel_blue",
                "arrow_label": "Propagates back to caller",
                "right_label": "Final Solution",
                "right_box_text": "Verified Mental Model",
                "right_box_color": "pastel_green",
                "is_socratic_puzzle": False,
                "socratic_options": []
            }
        ],
        "footer_summary": f"Every {clean} problem hinges on identifying what changes at each step and what stops the cycle.",
        "socratic_voice_prompt": "Look at the mystery box in row 2. Which outcome must occur to prevent an infinite loop?"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

