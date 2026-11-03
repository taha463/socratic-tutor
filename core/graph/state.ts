/**
 * LangGraph State Schema for Socratic Tutor Multi-Agent System.
 * Uses LangGraph Annotation.Root to define strongly typed graph state with functional reducers.
 */

import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatMessage } from "../llm/types";
import type { TeacherDraft } from "../agents/teacher";
import type { CriticVerdict } from "../agents/critic";
import type { AgentDeliberationTrace } from "../orchestrator";

export const SocraticGraphAnnotation = Annotation.Root({
  // Identity & context
  sessionId: Annotation<string>(),
  learnerId: Annotation<string>(),
  topic: Annotation<string>(),
  learnerMessage: Annotation<string>(),
  groundTruth: Annotation<string | null>({
    default: () => null,
  }),

  // Telemetry signals (WPM, hesitation seconds, backspace count, etc.)
  signals: Annotation<Record<string, any>>({
    default: () => ({}),
  }),

  // Conversation message stream with append reducer
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),

  // Formatted chat history for LLM prompt context
  history: Annotation<ChatMessage[]>({
    default: () => [],
  }),

  // Pedagogical ladder & diagnostic tracking
  currentRung: Annotation<number>({
    default: () => 1,
  }),
  rungName: Annotation<string>({
    default: () => "Probe",
  }),
  frustration: Annotation<number>({
    default: () => 0,
  }),
  learnerState: Annotation<string>({
    default: () => "ENGAGED",
  }),
  priorMastery: Annotation<number>({
    default: () => 0.1,
  }),
  detectedMisconception: Annotation<string | null>({
    default: () => null,
  }),
  ragContext: Annotation<string>({
    default: () => "",
  }),

  // Agent artifacts & cyclic deliberation
  teacherDraft: Annotation<TeacherDraft | null>({
    default: () => null,
  }),
  visualSpec: Annotation<Record<string, any> | null>({
    default: () => null,
  }),
  criticVerdict: Annotation<CriticVerdict | null>({
    default: () => null,
  }),
  criticPassed: Annotation<boolean>({
    default: () => true,
  }),
  rewriteCount: Annotation<number>({
    reducer: (_curr, update) => update,
    default: () => 0,
  }),
  rewriteInstructions: Annotation<string | null>({
    default: () => null,
  }),

  // Full multi-agent inspection trace for the UI HUD
  agentTrace: Annotation<AgentDeliberationTrace | null>({
    default: () => null,
  }),

  // Final approved response delivered to learner
  finalReply: Annotation<string>({
    default: () => "",
  }),
});

export type SocraticGraphStateType = typeof SocraticGraphAnnotation.State;
export type SocraticGraphUpdateType = typeof SocraticGraphAnnotation.Update;
