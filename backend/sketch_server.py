"""
SketchSocratic FastAPI Backend
Provides strict JSON schema-constrained Socratic Sketchboard generation via Groq openai/gpt-oss-120b.
"""

import os
import json
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

# Load environment variable if not already set in os.environ
if not os.environ.get("GROQ_API_KEY") and os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GROQ_API_KEY="):
                os.environ["GROQ_API_KEY"] = line.strip().split("=", 1)[1].strip()
            elif line.startswith("GROQ_MODEL=") and not os.environ.get("GROQ_MODEL"):
                os.environ["GROQ_MODEL"] = line.strip().split("=", 1)[1].strip()

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
    has_key = bool(os.environ.get("GROQ_API_KEY"))
    return {"status": "ok", "service": "SketchSocratic", "groq_configured": has_key}

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

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        fallback = generate_fallback_whiteboard(query)
        _sketchboard_cache[cache_key] = {"data": fallback, "ts": now}
        return fallback

    client = Groq(api_key=api_key)
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

    # If all models in cascade fail or are rate-limited, safely return dynamic fallback
    print(f"[SketchServer] All Groq models temporarily unavailable. Returning dynamic algorithmic Socratic board.")
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

