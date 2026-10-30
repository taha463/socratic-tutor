"""Database connectivity and schema initialization for Socratic Tutor v2."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Optional

DEFAULT_DB_PATH = Path(".socratic/socratic.db")
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_db_path(custom_path: Optional[str | Path] = None) -> Path:
    """Resolve the active database path from parameter, environment, or default."""
    if custom_path:
        return Path(custom_path)
    env_path = os.getenv("SOCRATIC_DB_PATH")
    if env_path:
        return Path(env_path)
    return DEFAULT_DB_PATH


def init_db(db_path: Optional[str | Path] = None) -> Path:
    """Initialize the SQLite database with the full schema.

    Creates parent directories if necessary, enables foreign keys and WAL mode.
    """
    resolved_path = get_db_path(db_path)
    resolved_path.parent.mkdir(parents=True, exist_ok=True)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = sqlite3.connect(resolved_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

    return resolved_path


def get_connection(db_path: Optional[str | Path] = None) -> sqlite3.Connection:
    """Return a configured sqlite3 connection with Row factory and foreign keys enabled."""
    resolved_path = get_db_path(db_path)
    if not resolved_path.exists():
        init_db(resolved_path)

    conn = sqlite3.connect(resolved_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

