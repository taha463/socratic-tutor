import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ingestProblemSpecification, type IngestedProblem } from "../core/problemIngest";

describe("Problem & Context Ingestion Tests", () => {
  const leetCodeProblem = `
Given the head of a singly linked list, reverse the list, and return the reversed list.
Example 1:
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]
Constraints:
The number of nodes in the list is the range [0, 5000].
-5000 <= Node.val <= 5000
Follow up: A linked list can be reversed either iteratively or recursively. Could you implement both?
  `.trim();

  test("ingests LeetCode style problem and extracts structured pedagogical spec", () => {
    const ingested: IngestedProblem = ingestProblemSpecification(leetCodeProblem);
    assert.ok(ingested.topic.length > 0);
    assert.ok(ingested.problemTitle.length > 0);
    assert.ok(Array.isArray(ingested.constraints));
    assert.ok(ingested.constraints.length >= 1);
    assert.ok(ingested.socraticProbe.includes("?"));
    assert.ok(!ingested.socraticProbe.includes("return head"), "Must never leak the solution in the opening probe");
    assert.ok(ingested.coreInvariants.length >= 1);
  });

  test("ingests raw buggy user code snippet and identifies invariants", () => {
    const buggyCode = `
def reverseList(head):
    prev = None
    curr = head
    while curr:
        curr.next = prev
        prev = curr
        curr = curr.next # Bug here! lost pointer
    return prev
    `.trim();

    const ingested = ingestProblemSpecification(buggyCode);
    assert.ok(ingested.topic.toLowerCase().includes("linked list") || ingested.topic.toLowerCase().includes("pointer"));
    assert.ok(ingested.socraticProbe.length > 15);
  });
});

