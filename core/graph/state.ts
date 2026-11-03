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

const lastValue = <T>(def: () => T) => ({
  value: (_curr: T, update: T) => update,
  default: def,
});

export const SocraticGraphAnnotation = Annotation.Root({
  // Identity & context
  sessionId: Annotation<string>(),
  learnerId: Annotation<string>(),
  topic: Annotation<string>(),
  learnerMessage: Annotation<string>(),
  groundTruth: Annotation<string | null>(lastValue<string | null>(() => null)),

  // Telemetry signals (WPM, hesitation seconds, backspace count, etc.)
  signals: Annotation<Record<string, any>>(lastValue<Record<string, any>>(() => ({}))),

  // Conversation message stream with append reducer
  messages: Annotation<BaseMessage[]>({
    value: (curr, update) => curr.concat(update),
    default: () => [],
  }),

  // Formatted chat history for LLM prompt context
  history: Annotation<ChatMessage[]>(lastValue<ChatMessage[]>(() => [])),

  // Pedagogical ladder & diagnostic tracking
  currentRung: Annotation<number>(lastValue(() => 1)),
  rungName: Annotation<string>(lastValue(() => "Probe")),
  frustration: Annotation<number>(lastValue(() => 0)),
  learnerState: Annotation<string>(lastValue(() => "ENGAGED")),
  priorMastery: Annotation<number | null>(lastValue<number | null>(() => 0.1)),
  detectedMisconception: Annotation<string | null>(lastValue<string | null>(() => null)),
  ragContext: Annotation<string>(lastValue(() => "")),

  // Agent artifacts & cyclic deliberation
  teacherDraft: Annotation<TeacherDraft | null>(lastValue<TeacherDraft | null>(() => null)),
  visualSpec: Annotation<Record<string, any> | null>(lastValue<Record<string, any> | null>(() => null)),
  criticVerdict: Annotation<CriticVerdict | null>(lastValue<CriticVerdict | null>(() => null)),
  criticPassed: Annotation<boolean>(lastValue(() => true)),
  rewriteCount: Annotation<number>({
    value: (_curr, update) => update,
    default: () => 0,
  }),
  rewriteInstructions: Annotation<string | null>(lastValue<string | null>(() => null)),

  // Full multi-agent inspection trace for the UI HUD
  agentTrace: Annotation<AgentDeliberationTrace | null>(lastValue<AgentDeliberationTrace | null>(() => null)),

  // Final approved response delivered to learner
  finalReply: Annotation<string>(lastValue(() => "")),
});

export type SocraticGraphStateType = typeof SocraticGraphAnnotation.State;
export type SocraticGraphUpdateType = typeof SocraticGraphAnnotation.Update;

