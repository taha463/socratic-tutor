/**
 * SQLite Database Connection & Schema Migration Manager
 * Uses Node 24+ built-in node:sqlite (DatabaseSync) for zero-dependency, local-first storage.
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

let globalDb: DatabaseSync | null = null;
let activeDbPath: string | null = null;

const DEFAULT_DB_PATH = process.env.DATABASE_PATH || "data/tutor.db";

/**
 * Returns schema SQL definition string.
 */
export function getSchemaSql(): string {
  const schemaPath = path.resolve(process.cwd(), "storage/schema.sql");
  return fs.readFileSync(schemaPath, "utf-8");
}

/**
 * Initialize and migrate the SQLite database.
 */
export function initDb(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
  if (globalDb && activeDbPath === dbPath) {
    return globalDb;
  }

  if (dbPath !== ":memory:") {
    const dir = path.dirname(path.resolve(process.cwd(), dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath === ":memory:" ? ":memory:" : path.resolve(process.cwd(), dbPath));
  
  // Enable foreign keys, WAL journal mode, and busy timeout for concurrent safety
  db.exec("PRAGMA foreign_keys = ON;");
  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
  }
  
  // Apply schema
  const schema = getSchemaSql();
  db.exec(schema);

  globalDb = db;
  activeDbPath = dbPath;
  return db;
}

/**
 * Retrieve the active database instance, initializing if needed.
 */
export function getDb(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
  if (!globalDb || activeDbPath !== dbPath) {
    return initDb(dbPath);
  }
  return globalDb;
}

/**
 * Close database connection (useful for isolated tests).
 */
export function closeDb(): void {
  if (globalDb) {
    try {
      globalDb.close();
    } catch {
      // Ignore if already closed
    }
    globalDb = null;
    activeDbPath = null;
  }
}
