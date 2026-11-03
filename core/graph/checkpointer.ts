/**
 * SQLite Graph Checkpointer for LangGraph State & Time-Travel Branching.
 * Stores state checkpoints at each turn/superstep, enabling conversation rewind and alternate branch exploration.
 */

import crypto from "node:crypto";
import { getDb } from "../../storage/db";
import type { SocraticGraphStateType } from "./state";

export interface CheckpointRecord {
  id: string;
  threadId: string;
  parentCheckpointId: string | null;
  state: SocraticGraphStateType;
  metadata: Record<string, any>;
  createdAt: string;
}

export class SocraticGraphCheckpointer {
  private db = getDb();

  constructor() {
    this.ensureTable();
  }

  private ensureTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS graph_checkpoints (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        parent_checkpoint_id TEXT,
        state_json TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON graph_checkpoints(thread_id, created_at);
    `);
  }

  /**
   * Saves a graph checkpoint for a thread.
   */
  saveCheckpoint(params: {
    threadId: string;
    checkpointId?: string;
    parentCheckpointId?: string | null;
    state: SocraticGraphStateType;
    metadata?: Record<string, any>;
  }): CheckpointRecord {
    const id = params.checkpointId || crypto.randomUUID();
    const parentCheckpointId = params.parentCheckpointId ?? null;
    const metadata = params.metadata || {};
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO graph_checkpoints (id, thread_id, parent_checkpoint_id, state_json, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.threadId,
      parentCheckpointId,
      JSON.stringify(params.state),
      JSON.stringify(metadata),
      createdAt
    );

    return {
      id,
      threadId: params.threadId,
      parentCheckpointId,
      state: params.state,
      metadata,
      createdAt,
    };
  }

  /**
   * Retrieves a specific checkpoint by ID.
   */
  getCheckpoint(threadId: string, checkpointId: string): CheckpointRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, thread_id, parent_checkpoint_id, state_json, metadata_json, created_at
      FROM graph_checkpoints
      WHERE thread_id = ? AND id = ?
    `);

    const row = stmt.get(threadId, checkpointId) as any;
    if (!row) return null;

    return {
      id: row.id,
      threadId: row.thread_id,
      parentCheckpointId: row.parent_checkpoint_id,
      state: JSON.parse(row.state_json),
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      createdAt: row.created_at,
    };
  }

  /**
   * Retrieves the most recent checkpoint for a thread.
   */
  getLatestCheckpoint(threadId: string): CheckpointRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, thread_id, parent_checkpoint_id, state_json, metadata_json, created_at
      FROM graph_checkpoints
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(threadId) as any;
    if (!row) return null;

    return {
      id: row.id,
      threadId: row.thread_id,
      parentCheckpointId: row.parent_checkpoint_id,
      state: JSON.parse(row.state_json),
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      createdAt: row.created_at,
    };
  }

  /**
   * Lists all checkpoints in chronological order for a thread (timeline view).
   */
  listCheckpoints(threadId: string): CheckpointRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, thread_id, parent_checkpoint_id, state_json, metadata_json, created_at
      FROM graph_checkpoints
      WHERE thread_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(threadId) as any[];
    return rows.map((r) => ({
      id: r.id,
      threadId: r.thread_id,
      parentCheckpointId: r.parent_checkpoint_id,
      state: JSON.parse(r.state_json),
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : {},
      createdAt: r.created_at,
    }));
  }

  /**
   * Time-Travel Forking: Clones a past checkpoint into a new thread to explore an alternate line of reasoning.
   */
  forkThread(sourceThreadId: string, sourceCheckpointId: string, newThreadId: string): CheckpointRecord {
    const source = this.getCheckpoint(sourceThreadId, sourceCheckpointId);
    if (!source) {
      throw new Error(`Checkpoint ${sourceCheckpointId} in thread ${sourceThreadId} not found.`);
    }

    const forkMetadata = {
      ...source.metadata,
      forkedFrom: {
        sourceThreadId,
        sourceCheckpointId,
        forkedAt: new Date().toISOString(),
      },
    };

    return this.saveCheckpoint({
      threadId: newThreadId,
      checkpointId: crypto.randomUUID(),
      parentCheckpointId: sourceCheckpointId,
      state: {
        ...source.state,
        sessionId: newThreadId,
      },
      metadata: forkMetadata,
    });
  }
}
