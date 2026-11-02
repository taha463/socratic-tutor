/**
 * Atomic Misconception Graph & Counterexample Engine
 * Catalogs precise cognitive anti-patterns and generates minimal
 * counterexamples that provoke constructive cognitive dissonance.
 */

export interface AtomicMisconception {
  id: string;
  concept: string;
  name: string;
  description: string;
  patternKeywords: string[][];
  counterexampleCode: string;
  counterexampleExplanation: string;
  provocativeQuestion: string;
}

export interface DetectedMisconception {
  id: string;
  name: string;
  description: string;
  counterexample: string;
  provocativeQuestion: string;
}

const MISCONCEPTION_REGISTRY: AtomicMisconception[] = [
  {
    id: "RECURSION_MISSING_BASE_CASE",
    concept: "recursion",
    name: "Autonomous Termination Fallacy",
    description: "Belief that recursive function calls automatically terminate or stop without an explicit guard condition.",
    patternKeywords: [
      ["no need", "base case"],
      ["don't need", "base case"],
      ["without", "base case"],
      ["stop", "automatically"],
      ["reach 0", "stop"],
    ],
    counterexampleCode: "function countDown(n) {\n  console.log(n);\n  return countDown(n - 1); // What happens when n = 0?\n}",
    counterexampleExplanation: "When n reaches 0, countDown(0) calls countDown(-1), then countDown(-2), until the computer runs out of memory (Stack Overflow).",
    provocativeQuestion: "If n reaches 0 and there is no if-statement to return early, what line executes next: line 2 or line 3?",
  },
  {
    id: "RECURSION_RETURN_OVERWRITE",
    concept: "recursion",
    name: "Frame Value Overwrite Fallacy",
    description: "Belief that return values in child stack frames overwrite or modify previous stack frames directly.",
    patternKeywords: [
      ["overwrite", "previous"],
      ["changes", "parent"],
      ["global", "return"],
      ["replaces", "stack"],
    ],
    counterexampleCode: "function sum(n) {\n  if (n <= 1) return 1;\n  return n + sum(n - 1);\n}",
    counterexampleExplanation: "Each call has its own isolated frame. sum(3) waits for sum(2) to resolve to 3 before performing 3 + 3 = 6.",
    provocativeQuestion: "While sum(1) is executing at the top of the stack, does sum(3) still exist in memory?",
  },
  {
    id: "POINTER_SHALLOW_VS_DEEP",
    concept: "linked list",
    name: "Pointer Deletion Fallacy",
    description: "Belief that changing a pointer reference deletes the target node object from system memory.",
    patternKeywords: [
      ["delete", "memory"],
      ["deletes", "node"],
      ["head.next", "delete"],
      ["disappears", "pointer"],
    ],
    counterexampleCode: "let a = { val: 10, next: null };\nlet head = a;\nhead = head.next; // Did object { val: 10 } get deleted?",
    counterexampleExplanation: "Reassigning head only changes which node the variable points to; the original node remains in memory as long as references exist.",
    provocativeQuestion: "If you change the contact name in your phone, does that delete the actual person from existence?",
  },
  {
    id: "ARRAY_OFF_BY_ONE_BOUNDS",
    concept: "arrays",
    name: "Length Equality Off-By-One",
    description: "Using index <= array.length instead of index < array.length due to confusing element count with zero-based indexing.",
    patternKeywords: [
      ["<=", "length"],
      ["index <= length"],
      ["last element is length"],
    ],
    counterexampleCode: "const arr = ['A', 'B', 'C']; // length is 3\nconsole.log(arr[3]); // What prints?",
    counterexampleExplanation: "An array of length 3 has elements at index 0, 1, and 2. Accessing index 3 yields undefined or an IndexOutOfBoundsException.",
    provocativeQuestion: "In an array of length 3, if the first element is at index 0, what is the index of the third element?",
  },
  {
    id: "ASYMPTOTIC_VS_CONSTANT",
    concept: "complexity",
    name: "Constant Loop Scale Fallacy",
    description: "Confusing large constant operations O(1) with linear growth O(n).",
    patternKeywords: [
      ["loop to 1000", "slower"],
      ["1000", "worse than o(n)"],
      ["constant", "slower than n"],
    ],
    counterexampleCode: "// Routine A: for i = 1 to 1,000,000\n// Routine B: for i = 1 to n\n// As n grows to 100,000,000, which one runs longer?",
    counterexampleExplanation: "Big-O measures the growth rate as n approaches infinity. A fixed million iterations is O(1) because it never scales with input size.",
    provocativeQuestion: "If n doubles from 1 billion to 2 billion, does Routine A take any longer to finish?",
  },
];

export function listAllMisconceptions(): AtomicMisconception[] {
  return [...MISCONCEPTION_REGISTRY];
}

export function getMisconceptionDefinition(id: string): AtomicMisconception | null {
  return MISCONCEPTION_REGISTRY.find((m) => m.id === id) || null;
}

export function detectAtomicMisconception(concept: string, text: string): DetectedMisconception | null {
  const normText = (text || "").toLowerCase();
  const normConcept = (concept || "").toLowerCase();

  for (const item of MISCONCEPTION_REGISTRY) {
    // Check concept relevance if applicable
    const conceptMatches =
      !concept ||
      item.concept.includes(normConcept) ||
      normConcept.includes(item.concept) ||
      normText.includes(item.concept);

    if (conceptMatches) {
      for (const pattern of item.patternKeywords) {
        const matchesAllWords = pattern.every((word) => normText.includes(word));
        if (matchesAllWords) {
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            counterexample: `${item.counterexampleExplanation}\n\nExample:\n${item.counterexampleCode}`,
            provocativeQuestion: item.provocativeQuestion,
          };
        }
      }
    }
  }

  return null;
}

export function generateTargetedCounterexample(id: string): {
  code: string;
  explanation: string;
  provocativeQuestion: string;
} {
  const item = getMisconceptionDefinition(id);
  if (!item) {
    return {
      code: "// Generic counterexample\nlet x = 1;",
      explanation: "Testing boundary conditions reveals unexpected state behavior.",
      provocativeQuestion: "What happens when input is null or 0?",
    };
  }

  return {
    code: item.counterexampleCode,
    explanation: item.counterexampleExplanation,
    provocativeQuestion: item.provocativeQuestion,
  };
}

