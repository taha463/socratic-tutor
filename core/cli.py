"""Command-line interface for Socratic Tutor v2."""

from __future__ import annotations

import argparse
import sys
from typing import Optional, Sequence

from storage.db import init_db


def build_parser() -> argparse.ArgumentParser:
    """Construct the command line parser for Socratic Tutor."""
    parser = argparse.ArgumentParser(
        prog="socratic",
        description="Socratic Tutor v2: Multi-agent pedagogical tutoring system.",
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Available commands")

    # Ask subcommand
    ask_parser = subparsers.add_parser("ask", help="Send a message or query to the Socratic tutor.")
    ask_parser.add_argument("message", type=str, help="Your message or question for the tutor.")
    ask_parser.add_argument("--session", "-s", type=str, default="cli-default", help="Session ID.")
    ask_parser.add_argument("--learner", "-l", type=str, default="learner-default", help="Learner ID.")
    ask_parser.add_argument("--topic", "-t", type=str, default="general", help="Topic to learn.")

    # Dashboard subcommand
    dash_parser = subparsers.add_parser("dashboard", help="Build or display the learner mastery dashboard.")
    dash_parser.add_argument("--learner", "-l", type=str, default="learner-default", help="Learner ID.")

    # Review subcommand
    review_parser = subparsers.add_parser("review", help="Review weak topics and decayed concepts.")
    review_parser.add_argument("--learner", "-l", type=str, default="learner-default", help="Learner ID.")

    # Diagnostic subcommand
    diag_parser = subparsers.add_parser("diagnostic", help="Start a diagnostic assessment.")
    diag_parser.add_argument("--learner", "-l", type=str, default="learner-default", help="Learner ID.")
    diag_parser.add_argument("--topic", "-t", type=str, default="recursion", help="Topic to diagnose.")

    # Web subcommand
    web_parser = subparsers.add_parser("web", help="Start the interactive web adapter interface.")
    web_parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1).")
    web_parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000).")
    web_parser.add_argument("--reload", action="store_true", help="Enable reload mode.")

    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.subcommand:
        parser.print_help()
        return 0

    # Ensure database is initialized
    init_db()

    if args.subcommand == "ask":
        # Import dynamically so foundation tests don't fail before core loop is built
        try:
            from core.orchestrator import TutorOrchestrator
            orchestrator = TutorOrchestrator()
            reply = orchestrator.handle_turn(
                session_id=args.session,
                learner_id=args.learner,
                learner_message=args.message,
                topic=args.topic,
            )
            print(f"\n[Socratic Tutor (Rung {reply.rung})]:\n{reply.text}\n")
            if reply.visual_path:
                print(f"[Visual Generated]: file://{reply.visual_path}\n")
        except ImportError:
            # Step 1 skeleton placeholder before orchestrator is built in Step 2
            print(f"[Socratic Tutor (Skeleton)]: Received message: '{args.message}'. Core orchestrator will process in Step 2.")
        return 0

    elif args.subcommand == "dashboard":
        try:
            from dashboard.build import build_dashboard
            path = build_dashboard(learner_id=args.learner)
            print(f"Dashboard generated: file://{path}")
        except ImportError:
            print("[Dashboard]: Dashboard builder module ready for Step 7.")
        return 0

    elif args.subcommand == "review":
        try:
            from core.learner import LearnerStore
            store = LearnerStore()
            weak = store.get_weak_concepts(args.learner)
            if not weak:
                print("No decayed or weak concepts found! Great work.")
            else:
                print(f"Recommended review concepts for {args.learner}:")
                for c in weak:
                    print(f" - {c['name']} (Mastery: {c['score']:.2f})")
        except ImportError:
            print("[Review]: Learner model ready for Step 3.")
        return 0

    elif args.subcommand == "diagnostic":
        print(f"Starting diagnostic for {args.learner} on {args.topic}...")
        return 0

    elif args.subcommand == "web":
        import uvicorn
        print(f"\n[Socratic Tutor v2] Starting web server on http://{args.host}:{args.port}")
        uvicorn.run("adapters.web.backend:app", host=args.host, port=args.port, reload=args.reload)
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
