/**
 * LangGraph StateGraph Assembly for Socratic Tutor.
 * Configures nodes, directed edges, and conditional rewrite loops.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { SocraticGraphAnnotation, type SocraticGraphStateType } from "./state";
import {
  createDiagnosticianNode,
  createTeacherNode,
  createCriticNode,
  createVisualizerNode,
  type SocraticNodeDependencies,
} from "./nodes";

/**
 * Builds the uncompiled Socratic StateGraph with cyclic quality gate.
 */
export function buildSocraticGraph(deps: SocraticNodeDependencies) {
  const workflow = new StateGraph(SocraticGraphAnnotation)
    .addNode("diagnostician", createDiagnosticianNode(deps))
    .addNode("teacher", createTeacherNode(deps))
    .addNode("critic", createCriticNode(deps))
    .addNode("visualizer", createVisualizerNode(deps));

  // 1. Start -> Diagnostician
  workflow.addEdge(START, "diagnostician");

  // 2. Diagnostician -> Teacher
  workflow.addEdge("diagnostician", "teacher");

  // 3. Teacher -> Critic Quality Gate
  workflow.addEdge("teacher", "critic");

  // 4. Conditional Edge: Critic -> [Teacher (Rewrite Loop) | Visualizer]
  workflow.addConditionalEdges(
    "critic",
    (state: SocraticGraphStateType) => {
      // Loop back to Teacher if rejected and rewrites bounded <= 2
      if (!state.criticPassed && state.rewriteCount <= 2) {
        return "teacher";
      }
      return "visualizer";
    },
    {
      teacher: "teacher",
      visualizer: "visualizer",
    }
  );

  // 5. Visualizer -> END
  workflow.addEdge("visualizer", END);

  return workflow;
}

/**
 * Generates Mermaid diagram syntax representing the Socratic LangGraph workflow.
 */
export function getSocraticGraphMermaid(): string {
  return `graph TD
    __start__([Start: Learner Input]) --> diagnostician[Diagnostician Agent<br/>Frustration & Misconception Analysis]
    diagnostician --> teacher[Teacher Agent<br/>Socratic Prompt Drafting]
    teacher --> critic[Critic Quality Gate<br/>Answer Leak & Multi-Question Check]
    critic -- "Rewrite needed (Max 2)" --> teacher
    critic -- "Approved" --> visualizer[Visualizer Agent<br/>Dynamic Scaffold & Sketchboard]
    visualizer --> __end__([End: Persist & Stream to Learner])`;
}
