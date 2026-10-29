-- Socratic Tutor v2 SQLite Schema

CREATE TABLE IF NOT EXISTS learners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    learner_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS turns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'learner' or 'tutor'
    text TEXT NOT NULL,
    rung INTEGER,
    skill_used TEXT,
    signals_json TEXT,
    critic_verdict TEXT,
    ts TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    FOREIGN KEY (parent_id) REFERENCES concepts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mastery (
    learner_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    score REAL NOT NULL DEFAULT 0.0, -- between 0.0 and 1.0
    attempts INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (learner_id, concept_id),
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mistakes (
    learner_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    pattern TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL,
    PRIMARY KEY (learner_id, concept_id, pattern),
    FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    ts TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_signals_session ON signals(session_id);
CREATE INDEX IF NOT EXISTS idx_mastery_learner ON mastery(learner_id);

