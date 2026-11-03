/**
 * LangGraph Socratic Multi-Agent Architecture Tests.
 * Verifies StateGraph compilation, cyclic critic rewrite loop,
 * SQLite checkpointing, and time-travel conversation forking.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSocraticGraph,
  getSocraticGraphMermaid,
  runSocraticGraphTurn,
  SocraticGraphCheckpointer,
} from "../core/graph";
import { DiagnosticianAgent } from "../core/agents/diagnostician";
import { TeacherAgent } from "../core/agents/teacher";
import { CriticAgent } from "../core/agents/critic";
import { VisualizerAgent } from "../core/agents/visualizer";
import { LearnerStore } from "../core/learner";
import { MockLLMProvider } from "../core/llm/mock";
import { initDb, closeDb } from "../storage/db";

describe("LangGraph Socratic StateGraph Architecture Tests", () => {
  it("compiles the Socratic StateGraph with correct node topology", () => {
    const mockLlm = new MockLLMProvider();
    const deps = {
      diagnostician: new DiagnosticianAgent(mockLlm),
      teacher: new TeacherAgent(mockLlm),
      critic: new CriticAgent(mockLlm),
      visualizer: new VisualizerAgent(mockLlm),
      learnerStore: new LearnerStore(),
    };

    const workflow = buildSocraticGraph(deps);
    const compiled = workflow.compile();

    assert.ok(compiled, "Compiled LangGraph state graph should exist");
    assert.equal(typeof compiled.invoke, "function", "Compiled graph must expose invoke()");

    const mermaid = getSocraticGraphMermaid();
    assert.ok(mermaid.includes("diagnostician"), "Mermaid must contain diagnostician node");
    assert.ok(mermaid.includes("teacher"), "Mermaid must contain teacher node");
    assert.ok(mermaid.includes("critic"), "Mermaid must contain critic node");
    assert.ok(mermaid.includes("visualizer"), "Mermaid must contain visualizer node");
    assert.ok(mermaid.includes("Rewrite needed"), "Mermaid must describe the cyclic rewrite loop");
  });

  it("executes cyclic rewrite loop when Critic detects answer leakage", async () => {
    const mockLlm = new MockLLMProvider();

    // 1. Diagnostician response
    mockLlm.enqueueResponse({
      level: "beginner",
      frustration: 0.2,
      state: "CONFUSED",
      recommendedRung: 1,
      reasoning: "Needs assistance with base case",
      isDiagnosticActive: false,
      diagnosticStep: 0,
    });

    // 2. 1st draft from Teacher: Leaks direct answer
    mockLlm.enqueueResponse({
      singleQuestion: "The answer is return 1. Do you see why?",
      replyText: "The answer is return 1. Do you see why?",
      pedagogicalIntent: "Flawed direct reveal",
      ladderRung: 1,
      needsVisual: false,
    });

    // 3. 2nd draft from Teacher (after Critic rejects and loops back): Pure Socratic inquiry
    mockLlm.enqueueResponse({
      singleQuestion: "What should a base case return when n reaches the bottom?",
      replyText: "What should a base case return when n reaches the bottom?",
      pedagogicalIntent: "Proper Socratic inquiry without leak",
      ladderRung: 1,
      needsVisual: false,
    });

    const deps = {
      diagnostician: new DiagnosticianAgent(mockLlm),
      teacher: new TeacherAgent(mockLlm),
      critic: new CriticAgent(mockLlm),
      visualizer: new VisualizerAgent(mockLlm),
      learnerStore: new LearnerStore(),
    };

    const workflow = buildSocraticGraph(deps);
    const compiled = workflow.compile();

    const result = await compiled.invoke({
      sessionId: "test-session-cyclic",
      learnerId: "learner-test",
      topic: "recursion",
      learnerMessage: "I don't know what base case to use",
      groundTruth: "Base case is n <= 1 return 1",
      currentRung: 1,
      rewriteCount: 0,
      history: [],
      signals: {},
      messages: [],
    });

    assert.equal(result.criticPassed, true, "Final state must pass critic gate");
    assert.equal(result.rewriteCount, 1, "Graph must have cycled back to teacher exactly once");
    assert.ok(
      result.finalReply.includes("What should a base case return"),
      "Approved reply must come from the rewritten draft"
    );
  });

  it("persists state checkpoints in SQLite and supports Time-Travel conversation forking", async () => {
    const cp = new SocraticGraphCheckpointer();
    const threadId = `thread-${Date.now()}`;

    // 1. Save turn 1 checkpoint
    const cp1 = cp.saveCheckpoint({
      threadId,
      checkpointId: "cp-turn-1",
      state: {
        sessionId: threadId,
        learnerId: "alice",
        topic: "binary_trees",
        learnerMessage: "What is the root node?",
        currentRung: 1,
        rungName: "Probe",
        frustration: 0.1,
        learnerState: "ENGAGED",
        finalReply: "Where does tree traversal begin?",
      } as any,
      metadata: { turnIndex: 1 },
    });

    assert.equal(cp1.id, "cp-turn-1");
    assert.equal(cp1.threadId, threadId);

    // 2. Save turn 2 checkpoint
    const cp2 = cp.saveCheckpoint({
      threadId,
      checkpointId: "cp-turn-2",
      parentCheckpointId: "cp-turn-1",
      state: {
        sessionId: threadId,
        learnerId: "alice",
        topic: "binary_trees",
        learnerMessage: "It starts at the top node",
        currentRung: 2,
        rungName: "Narrow question",
        frustration: 0.2,
        learnerState: "ENGAGED",
        finalReply: "If each node has two children, how do we distinguish left from right?",
      } as any,
      metadata: { turnIndex: 2 },
    });

    assert.equal(cp2.parentCheckpointId, "cp-turn-1");

    // 3. List checkpoints
    const history = cp.listCheckpoints(threadId);
    assert.equal(history.length, 2, "Thread must have 2 recorded checkpoints");
    assert.equal(history[0].id, "cp-turn-1");
    assert.equal(history[1].id, "cp-turn-2");

    // 4. Test Time-Travel Forking (Rewind to Turn 1 and explore alternate path)
    const forkedThreadId = `${threadId}-alternate-branch`;
    const forkedCp = cp.forkThread(threadId, "cp-turn-1", forkedThreadId);

    assert.equal(forkedCp.threadId, forkedThreadId, "Forked thread must have new threadId");
    assert.equal(forkedCp.parentCheckpointId, "cp-turn-1", "Forked thread must reference original parent");
    assert.equal(forkedCp.state.topic, "binary_trees");
    assert.equal(forkedCp.state.currentRung, 1, "Forked state must match Turn 1 snapshot");

    const forkedHistory = cp.listCheckpoints(forkedThreadId);
    assert.equal(forkedHistory.length, 1, "New branch starts with the forked turn 1 snapshot");
  });

  it("executes an end-to-end turn via runSocraticGraphTurn()", async () => {
    const mockLlm = new MockLLMProvider();
    const store = new LearnerStore();
    const deps = {
      diagnostician: new DiagnosticianAgent(mockLlm),
      teacher: new TeacherAgent(mockLlm),
      critic: new CriticAgent(mockLlm),
      visualizer: new VisualizerAgent(mockLlm),
      learnerStore: store,
    };

    const sessionId = `graph-session-${Date.now()}`;
    const result = await runSocraticGraphTurn(
      {
        sessionId,
        learnerId: "learner-graph-1",
        topic: "hash_maps",
        message: "How does a hash function find the right index?",
        signals: { hesitation_seconds: 1.2 },
      },
      deps
    );

    assert.ok(result.text, "Must produce Socratic response text");
    assert.equal(result.sessionId, sessionId);
    assert.ok(result.agentTrace, "Must include full multi-agent deliberation trace");
    assert.ok(result.agentTrace.diagnostician, "Trace must have diagnostician assessment");
    assert.ok(result.agentTrace.teacher, "Trace must have teacher reasoning");
    assert.ok(result.agentTrace.critic, "Trace must have critic evaluation");
    assert.equal(result.criticPassed, true, "Critic gate must pass");

    // Verify checkpoint was written to SQLite
    const cp = new SocraticGraphCheckpointer();
    const latest = cp.getLatestCheckpoint(sessionId);
    assert.ok(latest, "A checkpoint must be created for the turn");
    assert.equal(latest.state.sessionId, sessionId);
  });
});
