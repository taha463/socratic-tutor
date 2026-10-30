"""Security and functional tests for the sandboxed execution tracer."""

from __future__ import annotations

import tempfile
from pathlib import Path

from skills.registry import SkillRegistry
from skills.trace.sandbox import execute_sandboxed_trace


def test_sandboxed_trace_execution_success():
    """Verify trace records step-by-step state and call stack for recursion."""
    code = """def countdown(n):
    if n <= 0:
        return
    countdown(n - 1)

countdown(2)
"""
    result = execute_sandboxed_trace(code, timeout_seconds=4.0)
    assert result.status == "SUCCESS"
    assert len(result.steps) > 0

    # Verify call depth increments as recursion deepens
    depths = [s.call_depth for s in result.steps]
    assert max(depths) >= 2

    # Verify locals are captured
    n_values = [s.locals.get("n") for s in result.steps if "n" in s.locals]
    assert "2" in n_values
    assert "1" in n_values


def test_security_infinite_loop_timeout():
    """Verify infinite loops are terminated by hard timeout within 1.5s."""
    code = """while True:
    pass
"""
    result = execute_sandboxed_trace(code, timeout_seconds=1.5)
    assert result.status == "TIMEOUT"
    assert "timeout" in result.error_message.lower()


def test_security_forbidden_network_modules():
    """Verify static AST inspection strictly blocks network modules."""
    forbidden_snippets = [
        "import socket",
        "import urllib.request",
        "import http.client",
        "from requests import get",
        "import httpx",
    ]
    for snippet in forbidden_snippets:
        result = execute_sandboxed_trace(snippet)
        assert result.status == "SECURITY_VIOLATION", f"Failed to block: {snippet}"
        assert "forbidden" in result.error_message.lower()


def test_security_forbidden_execution_calls():
    """Verify eval, exec, and subprocess invocation are strictly blocked."""
    forbidden_snippets = [
        "import subprocess",
        "eval('1 + 1')",
        "exec('x = 2')",
        "__import__('os').system('ls')",
    ]
    for snippet in forbidden_snippets:
        result = execute_sandboxed_trace(snippet)
        assert result.status == "SECURITY_VIOLATION", f"Failed to block: {snippet}"


def test_trace_skill_render_html():
    """Verify TraceSkill generates interactive predict/compare HTML viewer with file persistence."""
    with tempfile.TemporaryDirectory() as tmpdir:
        vis_dir = Path(tmpdir) / "visuals"
        registry = SkillRegistry(visuals_dir=vis_dir)

        out = registry.render("trace", {
            "concept": "countdown",
            "code": "def f(x):\n    return x * 2\ny = f(3)",
            "prediction_prompt": "What is the return value of f(3)?",
        })

        assert out.skill == "trace"
        assert out.file_path is not None
        p = Path(out.file_path)
        assert p.exists()

        content = p.read_text(encoding="utf-8")
        assert "Predict First" in content
        assert "Call Stack" in content
        assert "Step 1 of" in content
