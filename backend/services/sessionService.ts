/**
 * Backend Session Service
 * Manages session creation, turn retrieval, and dynamic Socratic initialization
 */

import { getDb } from "@/storage/db";
import { LearnerStore } from "@/core/learner";
import type { SessionDetailDTO, SessionTurnDTO } from "../types";

export class SessionService {
  private store: LearnerStore;

  constructor() {
    this.store = new LearnerStore();
  }

  /**
   * Generates a tailored Socratic opening probe based on the requested topic
   */
  private getOpeningQuestionForTopic(topic: string): string {
    const t = topic.trim().toLowerCase();

    if (t.includes("recursion")) {
      return "Let's explore recursion. When a function calls itself, what stops it from calling itself forever?";
    }
    if (t.includes("binary search") || t.includes("search")) {
      return "Welcome! Today we are tackling Binary Search. If you are searching for a name in an alphabetized phonebook of 1,000 pages, why wouldn't you flip through page by page from the beginning?";
    }
    if (t.includes("tree") || t.includes("binary tree")) {
      return "Welcome to Trees! If you have a root node with two children, what makes a Binary Search Tree special compared to an ordinary tree?";
    }
    if (t.includes("stack") || t.includes("call stack")) {
      return "Let's examine the Call Stack. When function A calls function B, what happens to A's local variables while B is running?";
    }
    if (t.includes("pointer") || t.includes("reference")) {
      return "Welcome! Today we are looking at Pointers and References. What is the difference between the value stored in a variable and the memory address where that variable lives?";
    }
    if (t.includes("hash") || t.includes("map") || t.includes("dictionary")) {
      return "Let's dive into Hash Maps! How can a hash map look up a key in O(1) time without searching through all keys?";
    }
    if (t.includes("graph")) {
      return "Welcome to Graphs! What makes a general graph different from a tree or a linked list?";
    }
    if (t.includes("dynamic programming") || t.includes("dp")) {
      return "Welcome to Dynamic Programming! When solving complex problems, what is the advantage of storing the answers to smaller sub-problems?";
    }
    if (t.includes("sort")) {
      return `Welcome! When sorting a list of items, what is the best time complexity we can achieve by comparing items, and why?`;
    }

    // Default universal Socratic opening
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return `Welcome to your Socratic session on ${capitalizedTopic}! To start, what is your current understanding of this topic, or what specific problem are you trying to work through?`;
  }

  /**
   * Retrieves an existing session or initializes a new one with an opening probe
   */
  getSession(sessionId: string, topic = "General", learnerId = "default-learner"): SessionDetailDTO {
    const db = getDb();
    this.store.ensureLearner(learnerId, "Learner");

    // Check if session exists in DB
    let sessionRow = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as {
      id: string;
      learner_id: string;
      topic: string;
      started_at: string;
      ended_at?: string | null;
    } | undefined;

    const now = new Date().toISOString();

    if (!sessionRow) {
      // Create session row
      db.prepare(
        "INSERT INTO sessions (id, learner_id, topic, started_at) VALUES (?, ?, ?, ?)"
      ).run(sessionId, learnerId, topic, now);

      sessionRow = {
        id: sessionId,
        learner_id: learnerId,
        topic,
        started_at: now,
      };

      // Generate first Socratic opening question and save as first tutor turn
      const initialText = this.getOpeningQuestionForTopic(topic);
      const initialTurnId = `turn-${Date.now()}`;

      db.prepare(
        `INSERT INTO turns (id, session_id, role, text, rung, ts) 
         VALUES (?, ?, 'tutor', ?, 1, ?)`
      ).run(initialTurnId, sessionId, initialText, now);
    }

    // Retrieve all turns for this session
    const turnRows = db.prepare(
      `SELECT id, session_id, role, text, rung, skill_used, signals_json, ts 
       FROM turns 
       WHERE session_id = ? 
       ORDER BY ts ASC`
    ).all(sessionId) as Array<{
      id: string;
      session_id: string;
      role: "learner" | "tutor" | "system";
      text: string;
      rung?: number;
      skill_used?: string;
      signals_json?: string;
      ts: string;
    }>;

    const turns: SessionTurnDTO[] = turnRows.map((r) => {
      let visualSpec = null;
      let signals = undefined;

      if (r.skill_used) {
        try {
          visualSpec = JSON.parse(r.skill_used);
        } catch {}
      }

      if (r.signals_json) {
        try {
          signals = JSON.parse(r.signals_json);
        } catch {}
      }

      return {
        id: r.id,
        sessionId: r.session_id,
        role: r.role,
        text: r.text,
        rung: r.rung || 1,
        visualSpec,
        signals,
        timestamp: r.ts,
      };
    });

    // Find highest or active rung from latest tutor turn
    const latestTutorTurn = [...turns].reverse().find((t) => t.role === "tutor");
    const currentRung = latestTutorTurn?.rung || 1;

    return {
      sessionId: sessionRow.id,
      learnerId: sessionRow.learner_id,
      topic: sessionRow.topic,
      currentRung,
      frustration: 0.2,
      startedAt: sessionRow.started_at,
      endedAt: sessionRow.ended_at,
      turns,
      initialGreeting: turns.length > 0 ? turns[0].text : undefined,
    };
  }
}

