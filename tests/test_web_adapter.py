"""Unit and integration tests for Socratic Tutor Web Adapter."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from adapters.web.backend import VISUALS_DIR, app, set_orchestrator
from core.cli import build_parser
from core.llm import MockLLMProvider
from core.orchestrator import TutorOrchestrator
from storage.db import init_db


@pytest.fixture
def test_client():
    """Create isolated TestClient with dedicated temporary database."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "test_web.db"
        init_db(db_path)
        mock_llm = MockLLMProvider()
        orchestrator = TutorOrchestrator(llm=mock_llm, db_path=db_path)
        set_orchestrator(orchestrator)

        client = TestClient(app)
        yield client, orchestrator, db_path

        # Cleanup
        set_orchestrator(None)


def test_web_health_and_index(test_client):
    """Test health check and frontend index serving."""
    client, _, _ = test_client

    # Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"

    # Frontend index
    res_index = client.get("/")
    assert res_index.status_code == 200
    assert "Socratic Tutor v2" in res_index.text
    assert "Telemetry" in res_index.text


def test_web_chat_turn_standard(test_client):
    """Test standard learner chat interaction through web adapter."""
    client, _, _ = test_client

    payload = {
        "learner_id": "alice",
        "topic": "recursion",
        "message": "I think recursion is a function that calls itself.",
        "signals": {},
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["learner_id"] == "alice"
    assert data["session_id"].startswith("web-")
    assert "reply" in data and len(data["reply"]) > 5
    assert data["rung"] >= 1
    assert data["rung_name"] != "Unknown"
    assert data["critic_passed"] is True


def test_web_chat_behavioral_signal_paste(test_client):
    """Test that a large paste signal influences the diagnostician and teacher."""
    client, _, _ = test_client

    payload = {
        "learner_id": "bob",
        "topic": "recursion",
        "message": "def factorial(n): return 1 if n <= 1 else n * factorial(n - 1)",
        "signals": {
            "paste_event": True,
            "pasted_length": 150,
        },
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Diagnostician detects paste event
    assert data["state"] == "COPYING_SUSPECTED"
    assert data["rung"] == 1  # Kept at probe to test understanding


def test_web_chat_behavioral_signal_idle(test_client):
    """Test that extended idle time elevates frustration and triggers ladder adaptation."""
    client, _, _ = test_client

    payload = {
        "learner_id": "charlie",
        "topic": "recursion",
        "message": "I am not sure what comes next.",
        "signals": {
            "idle_seconds": 65.0,
        },
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    # High idle should boost frustration
    assert data["frustration"] > 0.3
    # Ladder recommended rung escalated to visual or smaller step
    assert data["rung"] >= 3


def test_web_chat_privacy_disabled(test_client):
    """Test that when privacy toggle disables signals, chat functions normally."""
    client, _, _ = test_client

    payload = {
        "learner_id": "dana",
        "topic": "binary_search",
        "message": "We check the middle element first.",
        "signals": {},  # Empty when privacy mode is active
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["critic_passed"] is True
    assert "reply" in data


def test_web_reset_session(test_client):
    """Test session reset endpoint generates new session ID."""
    client, _, _ = test_client

    res = client.post("/api/session/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["session_id"].startswith("web-")
    assert "reset successfully" in data["message"].lower()


def test_web_dashboard_html_endpoint(test_client):
    """Test dashboard generation and serving for learner."""
    client, _, _ = test_client

    # First send a message to create learner records
    client.post("/api/chat", json={"learner_id": "evan", "topic": "recursion", "message": "hello"})

    res = client.get("/api/dashboard/evan")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "Socratic Mastery Center" in res.text
    assert "evan" in res.text


def test_web_visual_serving_and_traversal_protection(test_client):
    """Test visual artifact serving and directory traversal blocking."""
    client, _, _ = test_client

    VISUALS_DIR.mkdir(parents=True, exist_ok=True)
    test_artifact = VISUALS_DIR / "test_artifact_sample.html"
    test_artifact.write_text("<div>Sample visual artifact</div>", encoding="utf-8")

    try:
        # Legitimate visual artifact request
        res = client.get(f"/api/visual/{test_artifact.name}")
        assert res.status_code == 200
        assert "Sample visual artifact" in res.text

        # Path traversal attack request
        res_traversal = client.get("/api/visual/../../pyproject.toml")
        assert res_traversal.status_code in (403, 404)
    finally:
        if test_artifact.exists():
            test_artifact.unlink()


def test_cli_web_parser():
    """Verify that 'socratic web' command arguments are recognized."""
    parser = build_parser()
    args = parser.parse_args(["web", "--port", "9090", "--host", "0.0.0.0"])
    assert args.subcommand == "web"
    assert args.port == 9090
    assert args.host == "0.0.0.0"
