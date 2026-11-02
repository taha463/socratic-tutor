"""
Unit and integration tests for SketchSocratic FastAPI backend.
"""

from fastapi.testclient import TestClient
from backend.sketch_server import app, sketchboard_schema

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "SketchSocratic"

def test_sketchboard_schema_structure():
    assert sketchboard_schema["type"] == "json_schema"
    inner = sketchboard_schema["json_schema"]
    assert inner["strict"] is True
    schema_props = inner["schema"]["properties"]
    assert "board_window_title" in schema_props
    assert "main_heading" in schema_props
    assert "rows" in schema_props
    assert "footer_summary" in schema_props
    assert "socratic_voice_prompt" in schema_props

def test_generate_sketch_tutor_endpoint():
    response = client.post("/api/sketch-tutor", json={"concept_query": "Recursion in Python"})
    assert response.status_code == 200
    data = response.json()
    assert "board_window_title" in data
    assert "main_heading" in data
    assert "rows" in data
    assert len(data["rows"]) >= 2
    
    # Must have at least one Socratic mystery box row
    puzzles = [r for r in data["rows"] if r.get("is_socratic_puzzle")]
    assert len(puzzles) >= 1, "Must contain at least one Socratic mystery puzzle"
    assert len(puzzles[0]["socratic_options"]) >= 2

def test_cache_and_flexible_colors():
    # Verify schema allows any string for box colors
    row_props = sketchboard_schema["json_schema"]["schema"]["properties"]["rows"]["items"]["properties"]
    assert row_props["left_box_color"]["type"] == "string"
    assert "enum" not in row_props["left_box_color"], "Color should not be constrained by restrictive enum"
    assert row_props["right_box_color"]["type"] == "string"
    assert "enum" not in row_props["right_box_color"], "Color should not be constrained by restrictive enum"

    # Fast repeat call test (cached)
    r1 = client.post("/api/sketch-tutor", json={"concept_query": "Call Stack Operations"})
    assert r1.status_code == 200
    r2 = client.post("/api/sketch-tutor", json={"concept_query": "Call Stack Operations"})
    assert r2.status_code == 200
    assert r1.json()["main_heading"] == r2.json()["main_heading"]

