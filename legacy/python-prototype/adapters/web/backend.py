"""FastAPI backend application for Socratic Tutor v2 Web Adapter."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from core.ladder import RUNG_DEFINITIONS
from core.orchestrator import TutorOrchestrator
from dashboard.build import build_dashboard
from storage.db import init_db

logger = logging.getLogger(__name__)

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
VISUALS_DIR = Path(".socratic/visuals").resolve()

# Initialize FastAPI application
app = FastAPI(
    title="Socratic Tutor v2",
    description="Multi-agent pedagogical tutor with adaptive hint ladder and behavioral telemetry.",
    version="2.0.0",
)

# Enable CORS for local development and embedded webviews
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    """Incoming learner chat message with optional behavioral telemetry."""

    session_id: Optional[str] = Field(default=None, description="Active session ID.")
    learner_id: str = Field(default="learner-default", description="Unique learner ID.")
    message: str = Field(..., description="Learner message text.")
    topic: str = Field(default="recursion", description="Active learning topic.")
    signals: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Client-side behavioral signals (paste, idle, tab switch, etc.).",
    )
    ground_truth: Optional[str] = Field(default=None, description="Optional ground truth.")


class ChatResponse(BaseModel):
    """Outgoing tutor response with pedagogical metadata and visual aids."""

    reply: str
    session_id: str
    learner_id: str
    rung: int
    rung_name: str
    visual_url: Optional[str] = None
    visual_html: Optional[str] = None
    state: str
    frustration: float
    critic_passed: bool
    rewrites_done: int


class ResetResponse(BaseModel):
    """Response payload for resetting a tutoring session."""

    session_id: str
    message: str


# Shared or configurable orchestrator
_orchestrator: Optional[TutorOrchestrator] = None


def get_orchestrator() -> TutorOrchestrator:
    """Retrieve or instantiate the TutorOrchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        init_db()
        _orchestrator = TutorOrchestrator()
    return _orchestrator


def set_orchestrator(orchestrator: Optional[TutorOrchestrator]) -> None:
    """Override orchestrator (useful for test isolation)."""
    global _orchestrator
    _orchestrator = orchestrator


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "version": "2.0.0", "adapter": "web"}


@app.post("/api/chat", response_model=ChatResponse)
def chat_turn(req: ChatRequest) -> ChatResponse:
    """Process a single learner turn and return Socratic response."""
    session_id = req.session_id or f"web-{uuid.uuid4().hex[:8]}"
    orchestrator = get_orchestrator()

    try:
        reply = orchestrator.handle_turn(
            session_id=session_id,
            learner_id=req.learner_id,
            learner_message=req.message,
            topic=req.topic,
            signals=req.signals or {},
            ground_truth=req.ground_truth,
        )

        visual_url: Optional[str] = None
        if reply.visual_path:
            v_file = Path(reply.visual_path).name
            visual_url = f"/api/visual/{v_file}"

        rung_name = "Unknown"
        if reply.rung in RUNG_DEFINITIONS:
            rung_name = RUNG_DEFINITIONS[reply.rung].name

        critic_passed = reply.critic_verdict.passed if reply.critic_verdict else True

        return ChatResponse(
            reply=reply.text,
            session_id=session_id,
            learner_id=req.learner_id,
            rung=reply.rung,
            rung_name=rung_name,
            visual_url=visual_url,
            visual_html=reply.visual_html,
            state=reply.learner_state,
            frustration=reply.frustration,
            critic_passed=critic_passed,
            rewrites_done=reply.rewrites_done,
        )
    except Exception as e:
        logger.exception("Error processing turn in web adapter")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/session/reset", response_model=ResetResponse)
def reset_session() -> ResetResponse:
    """Generate a clean new session ID for the learner."""
    new_id = f"web-{uuid.uuid4().hex[:8]}"
    return ResetResponse(session_id=new_id, message="Session reset successfully")


@app.get("/api/dashboard/{learner_id}", response_class=HTMLResponse)
def get_dashboard(learner_id: str) -> HTMLResponse:
    """Generate and return the full HTML mastery dashboard for this learner."""
    try:
        dash_path = build_dashboard(learner_id=learner_id)
        content = dash_path.read_text(encoding="utf-8")
        return HTMLResponse(content=content)
    except Exception as e:
        logger.exception("Error rendering dashboard for %s", learner_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate dashboard: {e}") from e


@app.get("/api/visual/{filename}")
def get_visual_file(filename: str) -> FileResponse:
    """Safely serve rendered visuals and traces, blocking path traversal."""
    # Ensure visuals directory exists
    VISUALS_DIR.mkdir(parents=True, exist_ok=True)
    target = (VISUALS_DIR / filename).resolve()

    # Security check: must reside inside VISUALS_DIR
    try:
        target.relative_to(VISUALS_DIR)
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden: path traversal detected.")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Visual artifact not found.")

    media_type = "text/html" if target.suffix == ".html" else "image/svg+xml"
    return FileResponse(target, media_type=media_type)


# Ensure static directory exists
STATIC_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def serve_index() -> FileResponse:
    """Serve the single-page frontend application."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return JSONResponse(
            status_code=200,
            content={"message": "Socratic Tutor API is running. Static frontend initializing."},
        )
    return FileResponse(index_file)


# Mount static files for assets
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

