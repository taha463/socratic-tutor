import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { sketchService } from "../backend/index";

describe("SketchSocratic Architecture & Schema Tests", () => {
  it("validates strict socratic sketchboard schema structure", () => {
    const mockBoard = {
      board_window_title: "Attention Mechanism · Sketchboard",
      main_heading: "Mapping Query-Key-Value in Attention",
      rows: [
        {
          row_type: "mapping_pair",
          left_label: "Input Tokens",
          left_box_text: "Word Embeddings X",
          left_box_color: "pastel_blue",
          arrow_label: "Linear projection via W_Q, W_K, W_V",
          right_label: "Intermediate Tensors",
          right_box_text: "Queries (Q), Keys (K), Values (V)",
          right_box_color: "pastel_purple",
          is_socratic_puzzle: false,
          socratic_options: [],
        },
        {
          row_type: "process_flow",
          left_label: "Scaled Dot-Product",
          left_box_text: "Q * K^T / sqrt(d_k)",
          left_box_color: "pastel_purple",
          arrow_label: "Normalized via Softmax",
          right_label: "Attention Weights",
          right_box_text: "Softmax Probability Matrix",
          right_box_color: "mystery_yellow",
          is_socratic_puzzle: true,
          socratic_options: [
            "Softmax Probability Matrix",
            "Random Gaussian Noise",
            "Scalar Sum",
            "Zero Tensor",
          ],
        },
      ],
      footer_summary: "Attention allows every token to look at and weight every other token.",
      socratic_voice_prompt: "Which matrix ensures all attention weights sum to 1.0 across each row?",
    };

    strictEqual(typeof mockBoard.board_window_title, "string");
    strictEqual(typeof mockBoard.main_heading, "string");
    ok(Array.isArray(mockBoard.rows));
    strictEqual(mockBoard.rows.length, 2);

    const puzzleRow = mockBoard.rows.find((r) => r.is_socratic_puzzle);
    ok(puzzleRow, "Must contain at least one socratic mystery box row");
    strictEqual(puzzleRow.right_box_color, "mystery_yellow");
    ok(puzzleRow.socratic_options.length >= 3, "Socratic mystery box must provide options");
    ok(puzzleRow.socratic_options.includes(puzzleRow.right_box_text));
  });

  it("verifies sketch service produces valid Socratic whiteboard", async () => {
    const data = await sketchService.generateSketchboard("Recursion Base Case");

    ok(data.board_window_title);
    ok(data.main_heading);
    ok(Array.isArray(data.rows) && data.rows.length >= 3);
    ok(data.rows.some((r) => r.is_socratic_puzzle));
    ok(data.footer_summary);
    ok(data.socratic_voice_prompt);
  });
});
