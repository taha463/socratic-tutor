-- Socratic Tutor v2: Core SQLite Schema
PRAGMA foreign_keys = ON;

-- Learners table
CREATE TABLE IF NOT EXISTS learners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Tutoring Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    learner_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
);

-- Turns table: logs every dialogue exchange and pedagogical rung
CREATE TABLE IF NOT EXISTS turns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('learner', 'tutor', 'system')),
    text TEXT NOT NULL,
    rung INTEGER,
    skill_used TEXT,
    signals_json TEXT,
    critic_verdict TEXT,
    ts TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Concepts knowledge graph
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    FOREIGN KEY (parent_id) REFERENCES concepts(id)
);

-- Learner Concept Mastery (Bayesian Knowledge Tracing / Decayed)
CREATE TABLE IF NOT EXISTS mastery (
    learner_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    score REAL NOT NULL CHECK(score >= 0.0 AND score <= 1.0),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (learner_id, concept_id),
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
);

-- Recurring mistake patterns
CREATE TABLE IF NOT EXISTS mistakes (
    learner_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    pattern TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL,
    PRIMARY KEY (learner_id, concept_id, pattern),
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
);

-- Client-side behavioral telemetry signals
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    ts TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_turns_session_ts ON turns(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_signals_session_ts ON signals(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_mastery_learner ON mastery(learner_id);
