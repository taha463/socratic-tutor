# Changelog

All notable changes to **Socratic Tutor** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-03

### Major Architecture Milestone: Socratic Tutor v2.0

Socratic Tutor v2.0 transitions the project from the centralized Docker/Celery/Redis/Mongo stack (`fehm-ai-engine`) to a high-performance, local-first Next.js App Router application with LangGraph multi-agent choreography and in-process SQLite.

### Added
- **LangGraph StateGraph Engine**: Cyclic multi-agent topology coordinating Diagnostician, Teacher, and synchronous Critic quality gate. Bounded self-correction loops ensure answers are never leaked.
- **SQLite Time-Travel Checkpointer**: Persists conversation states and supports state-forking and rewindable decision branches directly in local SQLite.
- **Interactive Python Notebook Sandbox**: Warm white grid notebook theme (`#FDFBF7`, 20px grid, macOS traffic lights, system coral buttons) with live variable stepper and mystery line highlights.
- **Verified Proof-of-Mastery Certificates**: Cryptographic SHA-256 certificate generation with exportable JSON credentials and printable portfolio artifact (`/api/certificate`).
- **Voice Socratic Co-Pilot**: Voice synthesis with markdown syntax stripping and browser Web Speech API dictation.
- **Multi-Agent Deliberation HUD**: Real-time inspection panel exposing consensus rationale and ladder progression to the learner.
- **Rich Visual Scaffolding Skills**: Interactive call stack tracers, Mermaid diagrams with prediction blanks, algorithmic complexity plots, and 3D spatial models.
- **Comprehensive CI/CD Quality Pipeline**: GitHub Actions workflow verifying TypeScript compilation (`tsc --noEmit`), 71 unit & integration tests, and production Next.js build.

### Changed
- **Zero-Config Storage**: Replaced external MongoDB Atlas with in-process SQLite (`node:sqlite` / WAL mode) with zero C++ compilation dependencies.
- **Client-Side Code Tracing**: Sandboxed code execution moved entirely into isolated browser Web Workers, preventing server-side execution risks.
- **Hallmark Modern-Minimal Design**: Redesigned UI with warm paper palettes (`#FAF8F5`, `#FFFDFB`), system coral accents (`#B93E29`, `#E8725A`), and tactile feedback.
- **Dashboard Wagon Wheel**: Re-engineered radar chart geometry with unified stacked labels to eliminate coordinate collisions, case deduplication, and overflow guards on progress bars.

### Deprecated / Archived
- **v1 Stack Archived**: Preserved the original legacy Python engine, Celery task queues, and FastAPI services in [`legacy/`](./legacy/) and on remote branch `v1-legacy`.

---

## [1.0.0] - 2026-04-15
- Initial prototype release of FEHM.AI cognitive engine with Celery, FastAPI, and MongoDB.
