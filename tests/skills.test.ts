import { describe, it, expect } from "./test-utils";
import { getSkillRegistry } from "../skills/registry";

describe("Skills Registry & Visual Schema Tests", () => {
  const registry = getSkillRegistry();

  it("lists all core visual skills", () => {
    const list = registry.list();
    expect(list).toContain("eli5");
    expect(list).toContain("diagram");
    expect(list).toContain("analogy");
    expect(list).toContain("plot");
    expect(list).toContain("animate");
    expect(list).toContain("three_d");
    expect(list).toContain("trace");
  });

  it("renders ELI5 analogy with mapping challenge and enforces blank presence", () => {
    const output = registry.render("eli5", {
      concept: "recursion",
      analogy: "A set of Russian nesting dolls, each opening until the tiny solid one.",
      mappingQuestion: "What corresponds to the tiny solid doll that does not open?",
    });

    expect(output.skill).toBe("eli5");
    expect(output.hasBlanks).toBe(true);
    expect(output.prompt).toContain("tiny solid doll");
  });

  it("renders Mermaid diagram with blanks and validates schema", () => {
    const output = registry.render("diagram", {
      concept: "binary_search",
      mermaidSource: "graph LR\n  A[Low=0] --> B[Mid=?BLANK?]\n  B --> C[High=10]",
      blanks: ["?BLANK?"],
      prompt: "What is the formula to calculate the mid index without integer overflow?",
    });

    expect(output.skill).toBe("diagram");
    expect(output.hasBlanks).toBe(true);
    expect(output.visualSpec.blanks).toHaveLength(1);
  });

  it("throws validation error when spec violates schema (e.g. missing required prompt)", () => {
    expect(() => {
      registry.render("diagram", {
        concept: "binary_search",
        mermaidSource: "graph LR\n A --> B",
        blanks: [], // violates .min(1)
      });
    }).toThrow();
  });

  it("renders curriculum analogy model", () => {
    const output = registry.render("analogy", {
      concept: "call_stack",
      analogy: "A stack of plates in a cafeteria where you can only add or remove the top plate.",
      mappingQuestion: "When a function finishes returning, which plate gets removed?",
    });

    expect(output.skill).toBe("analogy");
    expect(output.hasBlanks).toBe(true);
  });
});

