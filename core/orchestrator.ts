/**
 * Socratic Tutor Orchestrator: Coordinates Diagnostician, Teacher, Visualizer, Critic, and Ladder.
 */

import crypto from "node:crypto";
import { DiagnosticianAgent, type DiagnosticResult } from "./agents/diagnostician";
import { TeacherAgent, type TeacherDraft } from "./agents/teacher";
import { CriticAgent, type CriticVerdict } from "./agents/critic";
import { VisualizerAgent } from "./agents/visualizer";
import { HintLadder, RUNG_DEFINITIONS } from "./ladder";
import { LearnerStore } from "./learner";
import type { BaseLLMProvider, ChatMessage } from "./llm/types";
import { getLLMClient } from "./llm";
import { ragService } from "../backend/services/ragService";
import { detectAtomicMisconception } from "./misconceptions";
import { runSocraticGraphTurn, getSocraticGraphMermaid, SocraticGraphCheckpointer } from "./graph";

export interface AgentDeliberationTrace {
  timestamp: string;
  diagnostician: {
    state: string;
    frustration: number;
    recommendedRung: number;
    level: string;
    detectedMisconception?: string | null;
    reasoning: string;
    signals: Record<string, any>;
  };
  visualizer?: {
    chosenSkill: string;
    reasoning: string;
    concept: string;
  } | null;
  teacher: {
    singleQuestion: string;
    ladderRung: number;
    ladderName: string;
    hasFactualGrounding: boolean;
  };
  critic: {
    passed: boolean;
    leakDetected: boolean;
    multiQuestionViolation: boolean;
    rewritesDone: number;
    issues: string[];
    summary: string;
  };
}

export interface TutorResponse {
  text: string;
  sessionId: string;
  learnerId: string;
  rung: number;
  rungName: string;
  visualSpec?: Record<string, any> | null;
  state: string;
  frustration: number;
  criticVerdict?: CriticVerdict;
  criticPassed: boolean;
  rewritesDone: number;
  agentTrace?: AgentDeliberationTrace;
}

export class TutorOrchestrator {
  private llm: BaseLLMProvider;
  private diagnostician: DiagnosticianAgent;
  private teacher: TeacherAgent;
  private critic: CriticAgent;
  private visualizer: VisualizerAgent;
  private learnerStore: LearnerStore;

  constructor(options?: {
    llm?: BaseLLMProvider;
    learnerStore?: LearnerStore;
    diagnostician?: DiagnosticianAgent;
    teacher?: TeacherAgent;
    critic?: CriticAgent;
    visualizer?: VisualizerAgent;
  }) {
    this.llm = options?.llm || getLLMClient();
    this.learnerStore = options?.learnerStore || new LearnerStore();
    this.diagnostician = options?.diagnostician || new DiagnosticianAgent(this.llm);
    this.teacher = options?.teacher || new TeacherAgent(this.llm);
    this.critic = options?.critic || new CriticAgent(this.llm);
    this.visualizer = options?.visualizer || new VisualizerAgent(this.llm);
  }

  async handleTurn(params: {
    sessionId: string;
    learnerId: string;
    message: string;
    topic?: string;
    signals?: Record<string, any>;
    groundTruth?: string | null;
  }): Promise<TutorResponse> {
    const {
      sessionId,
      learnerId,
      message,
      topic = "general",
      signals = {},
      groundTruth = null,
    } = params;

    const now = new Date().toISOString();

    // 1. Ensure records exist
    this.learnerStore.ensureSession(sessionId, learnerId, topic);

    // Record incoming telemetry signals
    for (const [k, v] of Object.entries(signals)) {
      if (typeof v === "number") {
        this.learnerStore.recordSignal(sessionId, k, v);
      }
    }

    // 2. Persist learner message
    const learnerTurnId = crypto.randomUUID();
    this.learnerStore.recordTurn({
      id: learnerTurnId,
      sessionId,
      role: "learner",
      text: message,
      signalsJson: JSON.stringify(signals),
      ts: now,
    });

    // 3. Retrieve conversation history
    const priorTurns = this.learnerStore.getTurns(sessionId);
    const history: ChatMessage[] = priorTurns.slice(0, -1).map((t) => ({
      role: t.role === "learner" ? "user" : "assistant",
      content: t.text,
    }));

    // Determine current active ladder rung
    let lastTutorRung = 1;
    for (let i = priorTurns.length - 2; i >= 0; i--) {
      if (priorTurns[i].role === "tutor" && priorTurns[i].rung) {
        lastTutorRung = priorTurns[i].rung!;
        break;
      }
    }
    const ladder = new HintLadder(lastTutorRung);

    // 4. Diagnostician assessment
    const priorMastery = this.learnerStore.getMastery(learnerId, topic);
    const diag: DiagnosticResult = await this.diagnostician.diagnose({
      message,
      signals,
      history,
      priorMastery,
      priorTurnsCount: history.length,
    });

    // Update ladder state
    const isSuccess =
      diag.state === "MASTERY" ||
      message.toLowerCase().includes("got it") ||
      message.toLowerCase().includes("i understand");

    const activeRung = ladder.update({
      isSuccess,
      frustration: diag.frustration,
      recommendedRung: diag.recommendedRung,
    });

    // Update BKT mastery
    if (isSuccess) {
      this.learnerStore.updateMastery(learnerId, topic, true);
    } else if (diag.state === "STUCK") {
      this.learnerStore.updateMastery(learnerId, topic, false);
      this.learnerStore.recordMistake(learnerId, topic, "stuck_or_confused");
    }

    // Retrieve real-time external RAG grounding if message has substantial inquiry
    let ragContext = "";
    const cleanMsg = message.trim().toLowerCase();
    const isTrivial = ["yes", "no", "got it", "i understand", "ok", "next", "continue"].includes(cleanMsg);
    if (!isTrivial && message.length > 5) {
      try {
        const query = topic && topic !== "general" ? `${topic} ${message}` : message;
        ragContext = await ragService.search(query);
      } catch {
        ragContext = "";
      }
    }

    // Detect atomic misconception and inject targeted provocative counterexample
    const atomicMisconception = detectAtomicMisconception(topic, message);
    if (atomicMisconception) {
      this.learnerStore.recordMistake(learnerId, topic, `misconception:${atomicMisconception.id}`);
      const counterHint = `[Detected Atomic Misconception: ${atomicMisconception.name}]\n` +
        `The learner holds a misconception: "${atomicMisconception.description}".\n` +
        `Do NOT give away the solution. Guide them with this targeted counterexample challenge:\n` +
        `Provocative Question: "${atomicMisconception.provocativeQuestion}"\n` +
        `Counterexample: ${atomicMisconception.counterexample}`;
      ragContext = ragContext ? `${ragContext}\n\n${counterHint}` : counterHint;
    }

    // 5. Teacher-Critic iterative drafting loop (max 2 rewrites)
    const maxRewrites = 2;
    let rewriteCount = 0;
    let rewriteInstructions: string | null = null;
    let finalDraft: TeacherDraft | null = null;
    let finalVerdict: CriticVerdict | null = null;
    let visualSpec: Record<string, any> | null = null;

    while (rewriteCount <= maxRewrites) {
      // Draft pedagogical reply
      const draft = await this.teacher.draft({
        topic,
        learnerMessage: message,
        history,
        rung: activeRung,
        frustration: diag.frustration,
        learnerState: diag.state,
        behavioralSignals: signals,
        rewriteInstructions,
        groundTruth,
        factualGrounding: ragContext || null,
      });
      finalDraft = draft;

      // Handle visual aid if needed or if on Rung 4 or visual requested
      const wantsVisualInMsg = /draw|sketch|visual|diagram|whiteboard|show\s+me|notepad|picture|canvas|illustrat|graph\s+flow/i.test(message);
      const shouldProvideVisual = draft.needsVisual || activeRung === 4 || wantsVisualInMsg || diag.recommendedRung === 4;

      if (shouldProvideVisual) {
        let activeConcept = draft.visualConcept?.trim();
        if (!activeConcept || activeConcept.toLowerCase() === "general") {
          activeConcept = topic && topic.toLowerCase() !== "general" ? topic : message.slice(0, 60);
        }

        const visDecision = await this.visualizer.decide({
          concept: activeConcept,
          skillType: draft.visualType || "sketch",
          rung: Math.max(activeRung, 4),
          learnerLevel: diag.level,
          factualContext: ragContext || null,
        });
        visualSpec = {
          skill: visDecision.chosenSkill,
          ...visDecision.visualSpec,
          reasoning: visDecision.reasoning,
        };
      }

      // Critic quality gate
      const verdict = await this.critic.evaluate({
        draftText: draft.replyText,
        rung: activeRung,
        groundTruth,
        visualSpec,
      });
      finalVerdict = verdict;

      if (verdict.passed) {
        break;
      }

      rewriteCount += 1;
      rewriteInstructions = verdict.rewriteInstructions || "Review and enforce Socratic zero answer leak invariants.";
    }

    const rungName = RUNG_DEFINITIONS[activeRung]?.name || "Probe";
    const approvedText = finalDraft?.replyText || "What do you think happens next?";

    // 6. Build real-time Multi-Agent Deliberation Trace
    const agentTrace: AgentDeliberationTrace = {
      timestamp: new Date().toISOString(),
      diagnostician: {
        state: diag.state,
        frustration: Number((diag.frustration || 0).toFixed(2)),
        recommendedRung: diag.recommendedRung,
        level: diag.level,
        detectedMisconception: atomicMisconception ? atomicMisconception.name : null,
        reasoning: diag.reasoning || `Evaluated learner state as ${diag.state} with frustration ${(diag.frustration || 0).toFixed(2)}.`,
        signals,
      },
      visualizer: visualSpec ? {
        chosenSkill: visualSpec.skill || "sketch",
        reasoning: visualSpec.reasoning || "Scaffold generated with Socratic mystery gap.",
        concept: visualSpec.concept || topic,
      } : null,
      teacher: {
        singleQuestion: finalDraft?.singleQuestion || approvedText,
        ladderRung: activeRung,
        ladderName: rungName,
        hasFactualGrounding: Boolean(ragContext),
      },
      critic: {
        passed: finalVerdict?.passed ?? true,
        leakDetected: Boolean(finalVerdict?.answerLeaked),
        multiQuestionViolation: Boolean(finalVerdict?.multipleQuestions),
        rewritesDone: rewriteCount,
        issues: finalVerdict?.issues || [],
        summary: (finalVerdict?.passed ?? true)
          ? "Approved: 0 direct answer leakage detected. Enforced single question rule."
          : `Critic flagged violations: ${(finalVerdict?.issues || []).join("; ")}`,
      },
    };

    // 7. Record tutor turn
    const tutorTurnId = crypto.randomUUID();
    this.learnerStore.recordTurn({
      id: tutorTurnId,
      sessionId,
      role: "tutor",
      text: approvedText,
      rung: activeRung,
      skillUsed: visualSpec ? JSON.stringify(visualSpec) : null,
      criticVerdict: JSON.stringify({ verdict: finalVerdict, agentTrace }),
      ts: new Date().toISOString(),
    });

    return {
      text: approvedText,
      sessionId,
      learnerId,
      rung: activeRung,
      rungName,
      visualSpec,
      state: diag.state,
      frustration: diag.frustration,
      criticVerdict: finalVerdict ?? undefined,
      criticPassed: finalVerdict?.passed ?? true,
      rewritesDone: rewriteCount,
      agentTrace,
    };
  }

  /**
   * Executes a turn via the formal LangGraph StateGraph engine with cyclic quality gate
   * and SQLite checkpoint persistence.
   */
  async handleGraphTurn(params: {
    sessionId: string;
    learnerId: string;
    message: string;
    topic?: string;
    signals?: Record<string, any>;
    groundTruth?: string | null;
  }): Promise<TutorResponse> {
    return runSocraticGraphTurn(params, {
      diagnostician: this.diagnostician,
      teacher: this.teacher,
      critic: this.critic,
      visualizer: this.visualizer,
      learnerStore: this.learnerStore,
    });
  }

  /**
   * Returns the Mermaid diagram representation of the LangGraph multi-agent topology.
   */
  getGraphMermaid(): string {
    return getSocraticGraphMermaid();
  }
}
