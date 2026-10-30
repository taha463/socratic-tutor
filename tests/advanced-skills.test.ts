import { describe, it, expect } from "./test-utils";
import { getSkillRegistry } from "../skills/registry";

describe("Advanced Visual Skills Tests (Plot, Animate, 3D)", () => {
  const registry = getSkillRegistry();

  it("renders algorithmic complexity plot with blank curve target", () => {
    const output = registry.render("plot", {
      concept: "binary_search",
      plotType: "binary_search",
      blankTarget: "O(log n)",
      predictionPrompt: "Which complexity curve represents halving the search space each step?",
      curves: [
        {
          name: "O(n)",
          color: "#E8725A",
          isBlank: false,
          points: [{ x: 1, y: 1 }, { x: 10, y: 10 }],
        },
        {
          name: "O(log n)",
          color: "#B93E29",
          isBlank: true,
          points: [{ x: 1, y: 0 }, { x: 10, y: 3.32 }],
        },
      ],
    });

    expect(output.skill).toBe("plot");
    expect(output.hasBlanks).toBe(true);
    expect(output.visualSpec.blankTarget).toBe("O(log n)");
  });

  it("renders multi-step interactive animation with step predictions", () => {
    const output = registry.render("animate", {
      concept: "call_stack",
      title: "Activation Record Push and Pop",
      predictionPrompt: "What happens to the top stack frame when fact(1) returns?",
      blankStepIndex: 2,
      steps: [
        {
          stepNumber: 1,
          title: "Calling fact(2)",
          description: "fact(2) pushes a frame on top of fact(3)",
          elements: [
            { id: "frame-3", type: "stack_frame", label: "fact(3)", x: 20, y: 100 },
            { id: "frame-2", type: "stack_frame", label: "fact(2)", x: 20, y: 50, highlight: true },
          ],
        },
        {
          stepNumber: 2,
          title: "Calling fact(1)",
          description: "fact(1) reaches base case",
          elements: [
            { id: "frame-3", type: "stack_frame", label: "fact(3)", x: 20, y: 100 },
            { id: "frame-2", type: "stack_frame", label: "fact(2)", x: 20, y: 50 },
            { id: "frame-1", type: "stack_frame", label: "fact(1)", x: 20, y: 10, isBlank: true },
          ],
        },
      ],
    });

    expect(output.skill).toBe("animate");
    expect(output.hasBlanks).toBe(true);
    expect(output.visualSpec.steps).toHaveLength(2);
  });

  it("renders 3D spatial transformation model", () => {
    const output = registry.render("three_d", {
      concept: "linear_algebra",
      title: "Matrix Basis Vector Transformation",
      sceneType: "matrix_transform",
      blankTarget: "[2, 1]",
      predictionPrompt: "Predict where basis vector i-hat lands after transformation [[2, 0], [1, 1]]",
    });

    expect(output.skill).toBe("three_d");
    expect(output.hasBlanks).toBe(true);
    expect(output.visualSpec.sceneType).toBe("matrix_transform");
  });
});

