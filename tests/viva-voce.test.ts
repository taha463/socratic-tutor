import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateVivaVoceScenario,
  evaluateVivaVoceExplanation,
} from "../core/vivaVoce";
import type { VivaVoceScenario } from "../core/vivaVoce";

describe("Feynman / Reverse Socratic (Viva Voce) Tests", () => {
  test("generates a flawed peer scenario for a given topic", () => {
    const scenario: VivaVoceScenario = generateVivaVoceScenario("recursion");
    assert.ok(scenario.topic.toLowerCase().includes("recursion"));
    assert.ok(scenario.peerName.length > 0);
    assert.ok(scenario.flawedClaim.length > 20);
    assert.ok(scenario.underlyingFlaw.length > 10);
    assert.ok(Array.isArray(scenario.keyPointsToAddress));
    assert.ok(scenario.keyPointsToAddress.length >= 2);
  });

  test("generates sensible fallback scenario for unknown topics", () => {
    const scenario: VivaVoceScenario = generateVivaVoceScenario("quantum entanglement");
    assert.ok(scenario.topic.length > 0);
    assert.ok(scenario.flawedClaim.length > 10);
    assert.ok(scenario.keyPointsToAddress.length >= 2);
  });

  test("evaluates a strong student explanation that addresses key flaws", () => {
    const scenario = generateVivaVoceScenario("recursion");
    const strongExplanation =
      "Your code will fail because without a base case, the function will call itself infinitely until the call stack runs out of memory and crashes with a Stack Overflow. The base case gives a terminating condition where the function returns a concrete value instead of making another call.";

    const result = evaluateVivaVoceExplanation(scenario, strongExplanation);
    assert.equal(result.identifiesFlaw, true);
    assert.equal(result.soundReasoning, true);
    assert.ok(result.score >= 0.7);
    assert.equal(result.passed, true);
    assert.ok(result.feedback.length > 15);
  });

  test("evaluates a weak or vague student explanation and gives guidance", () => {
    const scenario = generateVivaVoceScenario("recursion");
    const weakExplanation = "No that is wrong. It won't work bro.";

    const result = evaluateVivaVoceExplanation(scenario, weakExplanation);
    assert.equal(result.passed, false);
    assert.ok(result.score < 0.6);
    assert.ok(result.feedback.includes("explain") || result.feedback.includes("why") || result.feedback.includes("detail"));
  });
});
