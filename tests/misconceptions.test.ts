import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  detectAtomicMisconception,
  getMisconceptionDefinition,
  listAllMisconceptions,
  generateTargetedCounterexample,
} from "../core/misconceptions";

describe("Atomic Misconception Graph Tests", () => {
  test("lists all registered atomic misconception concepts", () => {
    const list = listAllMisconceptions();
    assert.ok(list.length >= 4);
    assert.ok(list.some((m) => m.id === "RECURSION_MISSING_BASE_CASE"));
    assert.ok(list.some((m) => m.id === "POINTER_SHALLOW_VS_DEEP"));
  });

  test("detects recursion missing base case from student message", () => {
    const message = "We don't need a base case because n-1 will just reach 0 and stop";
    const detected = detectAtomicMisconception("recursion", message);
    assert.ok(detected !== null);
    assert.equal(detected?.id, "RECURSION_MISSING_BASE_CASE");
    assert.ok(detected?.counterexample.length > 20);
  });

  test("detects pointer reference confusion in linked lists", () => {
    const message = "If I change head to point to head.next, does that delete the first node from memory?";
    const detected = detectAtomicMisconception("linked list", message);
    assert.ok(detected !== null);
    assert.equal(detected?.id, "POINTER_SHALLOW_VS_DEEP");
  });

  test("returns null when learner message has no recognized misconception signature", () => {
    const message = "I am calculating the factorial using a loop";
    const detected = detectAtomicMisconception("recursion", message);
    assert.equal(detected, null);
  });

  test("generates targeted counterexample with code and provocative question", () => {
    const def = getMisconceptionDefinition("RECURSION_MISSING_BASE_CASE");
    assert.ok(def !== null);
    const counterexample = generateTargetedCounterexample("RECURSION_MISSING_BASE_CASE");
    assert.ok(counterexample.code.includes("def") || counterexample.code.includes("function"));
    assert.ok(counterexample.provocativeQuestion.includes("?"));
  });
});
