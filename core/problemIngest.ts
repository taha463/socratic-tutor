/**
 * Problem & Homework Ingestion Engine (Bring Your Own Problem / Code)
 * Parses student-provided problem descriptions, LeetCode tasks, or buggy snippets
 * into structured pedagogical contracts with ground-truth invariants.
 */

export interface IngestedProblem {
  problemTitle: string;
  topic: string;
  summary: string;
  constraints: string[];
  coreInvariants: string[];
  socraticProbe: string;
  groundTruthHint: string;
}

export function ingestProblemSpecification(rawText: string): IngestedProblem {
  const text = (rawText || "").trim();
  const lower = text.toLowerCase();

  // 1. Detect Topic & Title
  let topic = "General Problem Solving";
  let title = "Custom Challenge";

  if (lower.includes("linked list") || lower.includes("reverse") && lower.includes("head") || lower.includes("node.next")) {
    topic = "Linked Lists";
    title = lower.includes("reverse") ? "Reverse Linked List" : "Linked List Manipulation";
  } else if (lower.includes("binary search") || (lower.includes("sorted array") && lower.includes("target"))) {
    topic = "Binary Search";
    title = "Search in Sorted Collection";
  } else if (lower.includes("two sum") || (lower.includes("target") && lower.includes("indices"))) {
    topic = "Hash Maps & Two Pointers";
    title = "Target Pair Lookup";
  } else if (lower.includes("recursion") || lower.includes("base case") || lower.includes("fibonacci") || lower.includes("factorial")) {
    topic = "Recursion & Call Stacks";
    title = "Recursive Decomposition";
  } else if (lower.includes("dynamic programming") || lower.includes("memoization") || lower.includes("optimal substructure")) {
    topic = "Dynamic Programming";
    title = "Overlapping Subproblems";
  } else if (lower.includes("tree") || lower.includes("traversal") || lower.includes("root")) {
    topic = "Trees & Graphs";
    title = "Tree Navigation";
  }

  // 2. Extract Constraints
  const constraints: string[] = [];
  const lines = text.split("\n");
  let inConstraintsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes("constraint")) {
      inConstraintsSection = true;
      continue;
    }
    if (inConstraintsSection) {
      if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.match(/^\d+\./)) {
        constraints.push(trimmed.replace(/^[-*0-9.]\s*/, ""));
      } else if (trimmed.length === 0) {
        inConstraintsSection = false;
      }
    }
  }

  if (constraints.length === 0) {
    if (lower.includes("o(n)") || lower.includes("o(1)")) {
      constraints.push("Target optimal time and space complexity.");
    }
    constraints.push("Handle boundary states (null, single element, empty collections).");
  }

  // 3. Define Core Invariants
  const coreInvariants: string[] = [];
  if (topic === "Linked Lists") {
    coreInvariants.push("Never mutate a pointer without saving reference to subsequent nodes.");
    coreInvariants.push("The tail of the reversed list must point to null.");
  } else if (topic === "Binary Search") {
    coreInvariants.push("Search interval [low, high] must strictly shrink on every iteration.");
    coreInvariants.push("Array must maintain monotonic sorting order.");
  } else {
    coreInvariants.push("State mutations must satisfy the termination guarantee.");
    coreInvariants.push("Boundary invariants must hold for empty and single-element inputs.");
  }

  // 4. Formulate Socratic Opening Probe
  let socraticProbe = `To tackle ${title}, what is the very first step or state transition before processing the whole dataset?`;
  if (topic === "Linked Lists") {
    socraticProbe = "When updating a node's pointer to point backwards, what reference would be lost if not stored in a temporary variable first?";
  } else if (topic === "Binary Search") {
    socraticProbe = "When you inspect the midpoint element, how do you mathematically eliminate half of the remaining search space?";
  }

  const groundTruthHint = `Problem: ${title} (${topic}). Core invariants: ${coreInvariants.join("; ")}. Expected constraints: ${constraints.join("; ")}.`;

  return {
    problemTitle: title,
    topic,
    summary: text.slice(0, 180),
    constraints,
    coreInvariants,
    socraticProbe,
    groundTruthHint,
  };
}

