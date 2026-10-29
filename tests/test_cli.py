"""Unit tests for the CLI entrypoints and arguments."""

from __future__ import annotations

from core.cli import build_parser, main


def test_cli_parser_help():
    """Verify CLI parser builds cleanly with all expected subcommands."""
    parser = build_parser()
    subparsers_actions = [
        action for action in parser._actions if action.dest == "subcommand"
    ]
    assert len(subparsers_actions) == 1
    subcommands = subparsers_actions[0].choices.keys()
    assert "ask" in subcommands
    assert "dashboard" in subcommands
    assert "review" in subcommands
    assert "diagnostic" in subcommands


def test_cli_ask_skeleton(capsys):
    """Verify 'ask' subcommand runs without error."""
    code = main(["ask", "What is recursion?", "--session", "test-session", "--learner", "test-learner"])
    assert code == 0
    captured = capsys.readouterr()
    assert "Socratic Tutor" in captured.out


def test_cli_dashboard_skeleton(capsys):
    """Verify 'dashboard' subcommand runs without error."""
    code = main(["dashboard"])
    assert code == 0


def test_cli_no_args(capsys):
    """Verify invoking with no args prints help and exits with 0."""
    code = main([])
    assert code == 0
    captured = capsys.readouterr()
    assert "Socratic Tutor v2" in captured.out

