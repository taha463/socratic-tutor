/**
 * Universal Test Harness Bridge:
 * Backed by Node's built-in node:test and node:assert for instant, zero-dependency test execution.
 */

import { describe as nodeDescribe, it as nodeIt, beforeEach as nodeBeforeEach, afterEach as nodeAfterEach } from "node:test";
import assert from "node:assert";

export const describe = nodeDescribe;
export const it = nodeIt;
export const test = nodeIt;
export const beforeEach = nodeBeforeEach;
export const afterEach = nodeAfterEach;

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: any) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeGreaterThan(expected: number) {
      assert.ok(actual > expected, `Expected ${actual} to be greater than ${expected}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok(actual >= expected, `Expected ${actual} to be greater than or equal to ${expected}`);
    },
    toBeLessThan(expected: number) {
      assert.ok(actual < expected, `Expected ${actual} to be less than ${expected}`);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.ok(actual <= expected + 1e-6, `Expected ${actual} to be less than or equal to ${expected}`);
    },
    toHaveLength(expected: number) {
      assert.strictEqual(actual?.length, expected, `Expected length ${expected}, got ${actual?.length}`);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeDefined() {
      assert.ok(actual !== undefined, "Expected value to be defined");
    },
    toBeTruthy() {
      assert.ok(Boolean(actual));
    },
    toBeFalsy() {
      assert.ok(!Boolean(actual));
    },
    toContain(expected: string | any) {
      if (typeof actual === "string") {
        assert.ok(actual.includes(expected), `Expected "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual)) {
        assert.ok(actual.includes(expected), `Expected array to contain item`);
      }
    },
    toThrow() {
      if (typeof actual === "function") {
        assert.throws(actual);
      }
    },
    not: {
      toBe(expected: any) {
        assert.notStrictEqual(actual, expected);
      },
      toContain(expected: string | any) {
        if (typeof actual === "string") {
          assert.ok(!actual.includes(expected), `Expected "${actual}" NOT to contain "${expected}"`);
        } else if (Array.isArray(actual)) {
          assert.ok(!actual.includes(expected), `Expected array NOT to contain item`);
        }
      },
      toThrow() {
        if (typeof actual === "function") {
          assert.doesNotThrow(actual);
        }
      },
    },
  };
}
