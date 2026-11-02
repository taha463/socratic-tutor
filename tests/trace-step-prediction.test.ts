import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateTracePredictionCheckpoints,
  verifyStepPrediction,
  type TracePredictionCheckpoint,
} from "../skills/trace/stepper";

describe("Execution-Step Prediction Tests", () => {
  const sampleCode = `
def count_down(n):
    result = []
    while n > 0:
        result.append(n)
        n = n - 1
    return result
count_down(3)
  `.trim();

  test("generates step prediction checkpoints from executable code snippet", () => {
    const checkpoints: TracePredictionCheckpoint[] = generateTracePredictionCheckpoints(sampleCode);
    assert.ok(checkpoints.length >= 1, "Must generate at least one interactive prediction checkpoint");
    const cp = checkpoints[0];
    assert.ok(cp.lineNumber > 0);
    assert.ok(cp.variableName.length > 0);
    assert.ok(cp.question.includes("?"));
    assert.ok(cp.expectedValue.length > 0);
    assert.ok(Array.isArray(cp.options));
    assert.ok(cp.options.length >= 3);
    assert.ok(cp.options.includes(cp.expectedValue), "Options must contain the expected correct value");
  });

  test("validates a correct step prediction", () => {
    const checkpoints = generateTracePredictionCheckpoints(sampleCode);
    const cp = checkpoints[0];
    const outcome = verifyStepPrediction(cp, cp.expectedValue);
    assert.equal(outcome.correct, true);
    assert.ok(outcome.message.toLowerCase().includes("correct") || outcome.message.toLowerCase().includes("great"));
  });

  test("validates an incorrect step prediction and provides mental model contrast", () => {
    const checkpoints = generateTracePredictionCheckpoints(sampleCode);
    const cp = checkpoints[0];
    const incorrect = cp.options.find((opt) => opt !== cp.expectedValue) || "wrong_val";
    const outcome = verifyStepPrediction(cp, incorrect);
    assert.equal(outcome.correct, false);
    assert.ok(outcome.message.includes(cp.expectedValue));
    assert.equal(outcome.actualValue, cp.expectedValue);
  });
});
