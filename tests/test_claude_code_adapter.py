"""Unit tests verifying the Claude Code adapter, installation files, and command execution."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def test_claude_code_skill_manifest():
    """Verify that adapters/claude_code/SKILL.md is present and formatted."""
    skill_path = Path("adapters/claude_code/SKILL.md")
    assert skill_path.exists()
    content = skill_path.read_text(encoding="utf-8")
    assert "name: socratic" in content
    assert "python -m core.cli ask" in content
    assert "python -m core.cli dashboard" in content


def test_agents_guidelines_file():
    """Verify AGENTS.md exists with CLI commands and architecture overview."""
    agents_path = Path("AGENTS.md")
    assert agents_path.exists()
    content = agents_path.read_text(encoding="utf-8")
    assert "Socratic Tutor v2" in content
    assert "core/orchestrator.py" in content
    assert "python -m pytest" in content


def test_installer_scripts_exist():
    """Verify install.sh and install.ps1 exist and reference zero-config SQLite setup."""
    sh_path = Path("install.sh")
    ps_path = Path("install.ps1")
    assert sh_path.exists()
    assert ps_path.exists()

    sh_content = sh_path.read_text(encoding="utf-8")
    assert "init_db" in sh_content
    assert "claude/skills/socratic" in sh_content


def test_cli_teach_recursion_invocation():
    """Verify executing `/socratic teach me recursion` via CLI works cleanly."""
    cmd = [sys.executable, "-m", "core.cli", "ask", "teach me recursion", "--session", "test-fresh-clone"]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=10.0)
    assert res.returncode == 0
    assert "Socratic Tutor" in res.stdout
    assert "?" in res.stdout
