"""Command line runner for the Socratic Tutor Web Adapter."""

from __future__ import annotations

import argparse
import sys

import uvicorn


def main() -> int:
    """Run the web server."""
    parser = argparse.ArgumentParser(description="Start Socratic Tutor Web Adapter")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print(f"\n[Socratic Tutor v2] Starting web server on http://{args.host}:{args.port}")
    print("Open this URL in your browser to chat with the Socratic Tutor.\n")
    uvicorn.run("adapters.web.backend:app", host=args.host, port=args.port, reload=args.reload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
