/**
 * Viva Voce / Feynman Technique Module
 * Turns the tables: the AI acts as a junior peer with a subtle misconception,
 * and the student must explain, correct, and defend the concept.
 */

export interface VivaVoceScenario {
  id: string;
  topic: string;
  peerName: string;
  peerRole: string;
  flawedClaim: string;
  underlyingFlaw: string;
  keyPointsToAddress: string[];
}

export interface VivaVoceEvaluation {
  score: number; // 0.0 to 1.0
  passed: boolean; // score >= 0.70
  identifiesFlaw: boolean;
  soundReasoning: boolean;
  clearCounterexample: boolean;
  feedback: string;
}

const CURATED_SCENARIOS: Record<string, Omit<VivaVoceScenario, "id" | "topic">> = {
  recursion: {
    peerName: "Alex (Junior Intern)",
    peerRole: "Junior Developer",
    flawedClaim:
      "I realized base cases are just extra boilerplate! If we always decrement our argument (like n - 1), every function will eventually hit 0 or null anyway, so the operating system can just stop running it for us.",
    underlyingFlaw: "Confusion about call stack limits and termination conditions. Without an explicit base case, execution never stops until a stack overflow occurs.",
    keyPointsToAddress: ["call stack", "memory", "stack overflow", "terminating condition", "infinite loop"],
  },
  "binary search": {
    peerName: "Sam (Frontend Engineer)",
    peerRole: "Teammate",
    flawedClaim:
      "Binary search is O(log n), so I should use it on all my linked lists instead of arrays to quickly find items by jumping straight to the middle element!",
    underlyingFlaw: "Misunderstanding random access. Linked lists require O(n) sequential traversal to find the middle, completely defeating binary search benefits.",
    keyPointsToAddress: ["random access", "linked list", "indexing", "sequential traversal", "O(n)"],
  },
  "linked list": {
    peerName: "Jordan (Bootcamp Grad)",
    peerRole: "New Hire",
    flawedClaim:
      "To reverse a linked list, I can just swap `head` and `tail` pointers. That instantly reverses the entire list in O(1) time!",
    underlyingFlaw: "Failing to recognize that internal node pointers (`next`) still point in the forward direction. Swapping head and tail leaves the middle nodes unreversed and unreachable.",
    keyPointsToAddress: ["next pointer", "reverse internal pointers", "unreachable", "cycle", "traversal"],
  },
  "time complexity": {
    peerName: "Taylor (Self-Taught Coder)",
    peerRole: "Peer",
    flawedClaim:
      "A loop from 1 to 1000 is slower than a loop from 1 to n when n = 5, so the loop to 1000 has worse Big-O complexity than O(n)!",
    underlyingFlaw: "Confusing constant factor O(1) runtimes with asymptotic growth rates as n approaches infinity.",
    keyPointsToAddress: ["asymptotic growth", "constant time", "O(1)", "input size n", "infinity"],
  },
};

export function generateVivaVoceScenario(topic: string): VivaVoceScenario {
  const clean = (topic || "").trim().toLowerCase();
  
  for (const [key, scenario] of Object.entries(CURATED_SCENARIOS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return {
        id: `viva-${key}-${Date.now()}`,
        topic,
        ...scenario,
      };
    }
  }

  // Fallback scenario tailored dynamically to the requested topic
  return {
    id: `viva-custom-${Date.now()}`,
    topic,
    peerName: "Riley (New Peer)",
    peerRole: "Junior Engineer",
    flawedClaim: `I don't think we need to worry about edge cases or constraints when implementing ${topic}. As long as it works on our sample test data, edge cases almost never happen in real systems!`,
    underlyingFlaw: `Ignoring edge conditions, boundary limits, and unexpected inputs which cause runtime crashes and invalid state transitions in ${topic}.`,
    keyPointsToAddress: ["edge cases", "constraints", "boundary conditions", "failure modes", "invalid inputs"],
  };
}

export function evaluateVivaVoceExplanation(
  scenario: VivaVoceScenario,
  explanation: string
): VivaVoceEvaluation {
  const text = (explanation || "").trim().toLowerCase();
  
  if (text.length < 25) {
    return {
      score: 0.2,
      passed: false,
      identifiesFlaw: false,
      soundReasoning: false,
      clearCounterexample: false,
      feedback: "Your explanation is very brief. Please explain *why* their reasoning is flawed and what actually happens inside the system.",
    };
  }

  // Check matching key conceptual points
  let matchedPoints = 0;
  for (const point of scenario.keyPointsToAddress) {
    const words = point.toLowerCase().split(" ");
    if (words.some((w) => text.includes(w))) {
      matchedPoints++;
    }
  }

  const keywordCoverage = matchedPoints / scenario.keyPointsToAddress.length;
  const hasReasoningIndicator =
    text.includes("because") ||
    text.includes("since") ||
    text.includes("otherwise") ||
    text.includes("causes") ||
    text.includes("leads to") ||
    text.includes("instead of");

  const hasCounterexample =
    text.includes("for example") ||
    text.includes("if we") ||
    text.includes("consider") ||
    text.includes("what happens when") ||
    text.includes("fails when");

  let score = 0.35 + keywordCoverage * 0.45;
  if (hasReasoningIndicator) score += 0.15;
  if (hasCounterexample) score += 0.05;
  score = Math.min(1.0, Math.round(score * 100) / 100);

  const identifiesFlaw = keywordCoverage >= 0.4;
  const soundReasoning = hasReasoningIndicator && text.length > 60;
  const passed = score >= 0.65;

  let feedback = "";
  if (passed) {
    feedback = `Spot-on explanation! You clearly identified why ${scenario.peerName}'s claim breaks down. You showed a deep grasp of ${scenario.topic} by addressing how the system actually behaves under the hood.`;
  } else {
    feedback = `Good start, but ${scenario.peerName} might still be confused. Try to explicitly explain why this fails: consider mentioning how ${scenario.keyPointsToAddress.slice(0, 2).join(" or ")} is affected.`;
  }

  return {
    score,
    passed,
    identifiesFlaw,
    soundReasoning,
    clearCounterexample: hasCounterexample,
    feedback,
  };
}
