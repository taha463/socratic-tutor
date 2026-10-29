# Legacy FEHM.AI Engine (v1)

This directory preserves the historical v1 codebase of the FEHM.AI multi-agent pedagogical framework.

## Architecture of v1
- **Task Queue**: Celery with Redis broker
- **Database**: MongoDB Atlas
- **Backend**: FastAPI with async agent execution
- **Frontend**: React + Vite SPA

In Socratic Tutor v2, the architecture was re-engineered to be completely local, dependency-free (no Docker, Redis, Celery, or MongoDB required), SQLite-backed, verifiable via an autonomous evaluation harness, and compatible with both Claude Code CLI and a zero-friction Web UI.

