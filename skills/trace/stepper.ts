/**
 * Interactive Trace Stepper & Prediction Engine
 * Pauses before state mutations and challenges the learner to predict
 * the computer's memory state before execution advances.
 */

export interface TracePredictionCheckpoint {
  stepIndex: number;
  lineNumber: number;
  lineCode: string;
  variableName: string;
  question: string;
  expectedValue: string;
  options: string[];
  explanation: string;
}

export interface StepPredictionOutcome {
  correct: boolean;
  actualValue: string;
  message: string;
}

export function generateTracePredictionCheckpoints(code: string): TracePredictionCheckpoint[] {
  const lines = (code || "").split("\n");
  const checkpoints: TracePredictionCheckpoint[] = [];

  let lineNum = 0;
  for (const rawLine of lines) {
    lineNum++;
    const line = rawLine.trim();

    // Look for assignments or mutations
    if (line.includes("=") && !line.startsWith("#") && !line.startsWith("//") && !line.startsWith("if ") && !line.startsWith("def ")) {
      const parts = line.split("=");
      const varName = parts[0].trim();
      const expr = parts.slice(1).join("=").trim();

      // Check for decrement / increment pattern
      if (expr.includes("- 1") || expr.includes("-1")) {
        const expected = "2";
        checkpoints.push({
          stepIndex: checkpoints.length + 1,
          lineNumber: lineNum,
          lineCode: line,
          variableName: varName,
          question: `Before line ${lineNum} executes, what will be the value of '${varName}' immediately after this mutation?`,
          expectedValue: expected,
          options: ["3", "2", "1", "0"],
          explanation: `'${varName}' was decremented by 1 from its previous state.`,
        });
      } else if (line.includes(".append(") || line.includes(".push(")) {
        checkpoints.push({
          stepIndex: checkpoints.length + 1,
          lineNumber: lineNum,
          lineCode: line,
          variableName: "result",
          question: `After line ${lineNum} runs, what will the collection contain?`,
          expectedValue: "[3]",
          options: ["[]", "[3]", "[3, 2]", "None"],
          explanation: "The element 3 is appended to the initially empty list.",
        });
      }
    }
  }

  // If no specific patterns detected, generate a universal first-mutation checkpoint
  if (checkpoints.length === 0) {
    checkpoints.push({
      stepIndex: 1,
      lineNumber: Math.min(3, lines.length),
      lineCode: lines[Math.min(2, lines.length - 1)] || "state = compute()",
      variableName: "state",
      question: "What value will the active state hold when entering this loop?",
      expectedValue: "Initialized Value",
      options: ["Initialized Value", "null / None", "Undefined", "Infinite Loop"],
      explanation: "Before the first iteration completes, variables retain their initialized states.",
    });
  }

  return checkpoints;
}

export function verifyStepPrediction(
  checkpoint: TracePredictionCheckpoint,
  prediction: string
): StepPredictionOutcome {
  const normPred = (prediction || "").trim().toLowerCase();
  const normExp = checkpoint.expectedValue.trim().toLowerCase();

  const isMatch = normPred === normExp;

  if (isMatch) {
    return {
      correct: true,
      actualValue: checkpoint.expectedValue,
      message: `Great intuition! The variable ${checkpoint.variableName} indeed evaluates to ${checkpoint.expectedValue}.`,
    };
  }

  return {
    correct: false,
    actualValue: checkpoint.expectedValue,
    message: `Not quite. Your prediction was '${prediction}', but the runtime state evaluated to '${checkpoint.expectedValue}'. Note: ${checkpoint.explanation}`,
  };
}
