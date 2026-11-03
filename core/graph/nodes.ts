/**
 * LangGraph Agent Nodes for Socratic Tutor.
 * Encapsulates Diagnostician, Teacher, Critic, and Visualizer as discrete, functional graph nodes.
 */

import { DiagnosticianAgent } from "../agents/diagnostician";
import { TeacherAgent } from "../agents/teacher";
import { CriticAgent } from "../agents/critic";
import { VisualizerAgent } from "../agents/visualizer";
import { HintLadder, RUNG_DEFINITIONS } from "../ladder";
import { LearnerStore } from "../learner";
import { ragService } from "../../backend/services/ragService";
import { detectAtomicMisconception } from "../misconceptions";
import type { SocraticGraphStateType, SocraticGraphUpdateType } from "./state";
import type { AgentDeliberationTrace } from "../orchestrator";

export interface SocraticNodeDependencies {
  diagnostician: DiagnosticianAgent;
  teacher: TeacherAgent;
  critic: CriticAgent;
  visualizer: VisualizerAgent;
  learnerStore: LearnerStore;
}

/**
 * Diagnostician Node: Analyzes learner message, behavioral signals, updates BKT mastery,
 * detects atomic misconceptions, and calculates the pedagogical ladder rung.
 */
export function createDiagnosticianNode(deps: SocraticNodeDependencies) {
  return async (state: SocraticGraphStateType): Promise<SocraticGraphUpdateType> => {
    const {
      sessionId,
      learnerId,
      topic,
      learnerMessage,
      signals,
      history,
      currentRung,
    } = state;

    // 1. Diagnostic assessment
    const priorMastery = deps.learnerStore.getMastery(learnerId, topic);
    const diag = await deps.diagnostician.diagnose({
      message: learnerMessage,
      signals,
      history,
      priorMastery,
      priorTurnsCount: history.length,
    });

    // 2. Ladder calculation
    const isSuccess =
      diag.state === "MASTERY" ||
      learnerMessage.toLowerCase().includes("got it") ||
      learnerMessage.toLowerCase().includes("i understand");

    const ladder = new HintLadder(currentRung);
    const activeRung = ladder.update({
      isSuccess,
      frustration: diag.frustration,
      recommendedRung: diag.recommendedRung,
    });
    const rungName = RUNG_DEFINITIONS[activeRung]?.name || "Probe";

    // 3. Update BKT mastery and mistake tracking
    if (isSuccess) {
      deps.learnerStore.updateMastery(learnerId, topic, true);
    } else if (diag.state === "STUCK") {
      deps.learnerStore.updateMastery(learnerId, topic, false);
      deps.learnerStore.recordMistake(learnerId, topic, "stuck_or_confused");
    }

    // 4. Retrieve real-time external RAG grounding if applicable
    let ragContext = "";
    const cleanMsg = learnerMessage.trim().toLowerCase();
    const isTrivial = ["yes", "no", "got it", "i understand", "ok", "next", "continue"].includes(cleanMsg);
    if (!isTrivial && learnerMessage.length > 5) {
      try {
        const query = topic && topic !== "general" ? `${topic} ${learnerMessage}` : learnerMessage;
        ragContext = await ragService.search(query);
      } catch {
        ragContext = "";
      }
    }

    // 5. Detect atomic misconception and inject targeted provocative counterexample
    const atomicMisconception = detectAtomicMisconception(topic, learnerMessage);
    if (atomicMisconception) {
      deps.learnerStore.recordMistake(learnerId, topic, `misconception:${atomicMisconception.id}`);
      const counterHint = `[Detected Atomic Misconception: ${atomicMisconception.name}]\n` +
        `The learner holds a misconception: "${atomicMisconception.description}".\n` +
        `Do NOT give away the solution. Guide them with this targeted counterexample challenge:\n` +
        `Provocative Question: "${atomicMisconception.provocativeQuestion}"\n` +
        `Counterexample: ${atomicMisconception.counterexample}`;
      ragContext = ragContext ? `${ragContext}\n\n${counterHint}` : counterHint;
    }

    return {
      currentRung: activeRung,
      rungName,
      frustration: diag.frustration,
      learnerState: diag.state,
      detectedMisconception: atomicMisconception ? atomicMisconception.name : null,
      ragContext,
      priorMastery,
    };
  };
}

/**
 * Teacher Node: Generates Socratic inquiry adhering to zero answer leakage and One-Question Rule.
 * Receives rewriteInstructions when looping from the Critic node.
 */
export function createTeacherNode(deps: SocraticNodeDependencies) {
  return async (state: SocraticGraphStateType): Promise<SocraticGraphUpdateType> => {
    const {
      topic,
      learnerMessage,
      history,
      currentRung,
      frustration,
      learnerState,
      signals,
      rewriteInstructions,
      groundTruth,
      ragContext,
    } = state;

    const draft = await deps.teacher.draft({
      topic,
      learnerMessage,
      history,
      rung: currentRung,
      frustration,
      learnerState,
      behavioralSignals: signals,
      rewriteInstructions,
      groundTruth,
      factualGrounding: ragContext || null,
    });

    return {
      teacherDraft: draft,
      finalReply: draft.replyText,
    };
  };
}

/**
 * Critic Node: Synchronous Socratic quality gate.
 * Validates zero answer leakage, single-question invariant, and code dump prohibition.
 */
export function createCriticNode(deps: SocraticNodeDependencies) {
  return async (state: SocraticGraphStateType): Promise<SocraticGraphUpdateType> => {
    const {
      teacherDraft,
      currentRung,
      groundTruth,
      rewriteCount,
    } = state;

    const draftText = teacherDraft?.replyText || "What do you think happens next?";
    const verdict = await deps.critic.evaluate({
      draftText,
      rung: currentRung,
      groundTruth,
      visualSpec: null,
    });

    if (verdict.passed) {
      return {
        criticVerdict: verdict,
        criticPassed: true,
        rewriteInstructions: null,
        finalReply: draftText,
      };
    }

    // Rewrite needed
    const nextRewriteCount = rewriteCount + 1;
    return {
      criticVerdict: verdict,
      criticPassed: false,
      rewriteCount: nextRewriteCount,
      rewriteInstructions: verdict.rewriteInstructions || "Review and enforce Socratic zero answer leak invariants.",
      finalReply: draftText,
    };
  };
}

/**
 * Visualizer Node: Decides whether to generate visual scaffolding (Sketch, Diagram, Trace).
 * Compiles the final Multi-Agent Deliberation Audit Trace.
 */
export function createVisualizerNode(deps: SocraticNodeDependencies) {
  return async (state: SocraticGraphStateType): Promise<SocraticGraphUpdateType> => {
    const {
      topic,
      learnerMessage,
      currentRung,
      rungName,
      frustration,
      learnerState,
      detectedMisconception,
      signals,
      ragContext,
      teacherDraft,
      criticVerdict,
      rewriteCount,
      finalReply,
    } = state;

    const wantsVisualInMsg = /draw|sketch|visual|diagram|whiteboard|show\s+me|notepad|picture|canvas|illustrat|graph\s+flow/i.test(learnerMessage);
    const shouldProvideVisual = (teacherDraft?.needsVisual) || currentRung === 4 || wantsVisualInMsg;

    let visualSpec: Record<string, any> | null = null;

    if (shouldProvideVisual) {
      let activeConcept = teacherDraft?.visualConcept?.trim();
      if (!activeConcept || activeConcept.toLowerCase() === "general") {
        activeConcept = topic && topic.toLowerCase() !== "general" ? topic : learnerMessage.slice(0, 60);
      }

      const visDecision = await deps.visualizer.decide({
        concept: activeConcept,
        skillType: teacherDraft?.visualType || "sketch",
        rung: Math.max(currentRung, 4),
        learnerLevel: "INTERMEDIATE",
        factualContext: ragContext || null,
      });

      visualSpec = {
        skill: visDecision.chosenSkill,
        ...visDecision.visualSpec,
        reasoning: visDecision.reasoning,
      };
    }

    const approvedText = teacherDraft?.replyText || finalReply || "What do you think happens next?";

    // Build the Agent Deliberation HUD Trace
    const agentTrace: AgentDeliberationTrace = {
      timestamp: new Date().toISOString(),
      diagnostician: {
        state: learnerState,
        frustration: Number((frustration || 0).toFixed(2)),
        recommendedRung: currentRung,
        level: "INTERMEDIATE",
        detectedMisconception,
        reasoning: `Evaluated learner state as ${learnerState} with frustration ${(frustration || 0).toFixed(2)}.`,
        signals,
      },
      visualizer: visualSpec ? {
        chosenSkill: visualSpec.skill || "sketch",
        reasoning: visualSpec.reasoning || "Scaffold generated with Socratic mystery gap.",
        concept: visualSpec.concept || topic,
      } : null,
      teacher: {
        singleQuestion: teacherDraft?.singleQuestion || approvedText,
        ladderRung: currentRung,
        ladderName: rungName,
        hasFactualGrounding: Boolean(ragContext),
      },
      critic: {
        passed: criticVerdict?.passed ?? true,
        leakDetected: Boolean(criticVerdict?.answerLeaked),
        multiQuestionViolation: Boolean(criticVerdict?.multipleQuestions),
        rewritesDone: rewriteCount,
        issues: criticVerdict?.issues || [],
        summary: (criticVerdict?.passed ?? true)
          ? "Approved: 0 direct answer leakage detected. Enforced single question rule."
          : `Critic flagged violations: ${(criticVerdict?.issues || []).join("; ")}`,
      },
    };

    return {
      visualSpec,
      agentTrace,
      finalReply: approvedText,
    };
  };
}
