import { describe, it, expect } from "./test-utils";
import { HintLadder } from "../core/ladder";

describe("Hint Ladder Progression Tests", () => {
  it("initializes at specified rung (default Rung 1)", () => {
    const ladder = new HintLadder();
    expect(ladder.currentRung).toBe(1);
    expect(ladder.getRungName()).toBe("Probe");
  });

  it("escalates after 2 consecutive failures on the same rung", () => {
    const ladder = new HintLadder(1);

    // Turn 1 failure
    const r1 = ladder.update({ isSuccess: false });
    expect(r1).toBe(1);

    // Turn 2 failure -> escalates to Rung 2
    const r2 = ladder.update({ isSuccess: false });
    expect(r2).toBe(2);
    expect(ladder.getRungName()).toBe("Narrow question");
  });

  it("escalates after 3 turns on current rung without success", () => {
    const ladder = new HintLadder(1);
    // Artificially reset failed count to test turns threshold
    ladder.turnsOnCurrentRung = 2;
    ladder.failedAttemptsOnRung = 0;

    const nextRung = ladder.update({ isSuccess: false });
    expect(nextRung).toBe(2);
  });

  it("escalates immediately when frustration exceeds 0.7", () => {
    const ladder = new HintLadder(1);
    const nextRung = ladder.update({ isSuccess: false, frustration: 0.85 });
    expect(nextRung).toBe(2);
  });

  it("de-escalates scaffolding when learner succeeds", () => {
    const ladder = new HintLadder(4); // Rung 4 (Visual)
    const nextRung = ladder.update({ isSuccess: true });
    expect(nextRung).toBe(3); // Drops to Rung 3 (Analogy)

    const nextRung2 = ladder.update({ isSuccess: true });
    expect(nextRung2).toBe(2);

    const nextRung3 = ladder.update({ isSuccess: true });
    expect(nextRung3).toBe(1); // Floor at 1

    const nextRung4 = ladder.update({ isSuccess: true });
    expect(nextRung4).toBe(1); // Stays at 1
  });

  it("respects upper bound of Rung 7", () => {
    const ladder = new HintLadder(7);
    const nextRung = ladder.update({ isSuccess: false, frustration: 0.9 });
    expect(nextRung).toBe(7);
    expect(ladder.getRungName()).toBe("Full explanation + transfer check");
  });
});
