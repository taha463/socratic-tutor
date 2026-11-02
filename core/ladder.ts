/**
 * 7-Rung Pedagogical Hint Ladder
 * Prevents learners from getting stuck while guaranteeing answers are not given prematurely.
 */

export interface RungDefinition {
  level: number;
  name: string;
  pedagogy: string;
  allowsDirectAnswer: boolean;
}

export const RUNG_DEFINITIONS: Record<number, RungDefinition> = {
  1: {
    level: 1,
    name: "Probe",
    pedagogy: "Ask what the learner already thinks or has tried. Never give hints yet.",
    allowsDirectAnswer: false,
  },
  2: {
    level: 2,
    name: "Narrow question",
    pedagogy: "Ask a smaller, concrete sub-question.",
    allowsDirectAnswer: false,
  },
  3: {
    level: 3,
    name: "Analogy / ELI5",
    pedagogy: "Provide an everyday analogy and ask the learner to map it back.",
    allowsDirectAnswer: false,
  },
  4: {
    level: 4,
    name: "Visual with blanks",
    pedagogy: "Diagram, plot, or trace with missing pieces for learner to predict.",
    allowsDirectAnswer: false,
  },
  5: {
    level: 5,
    name: "Worked example",
    pedagogy: "Solve a different but structurally similar problem fully, then ask to apply it.",
    allowsDirectAnswer: false,
  },
  6: {
    level: 6,
    name: "Partial reveal",
    pedagogy: "Reveal the key step with explanation; ask the learner to finish.",
    allowsDirectAnswer: false,
  },
  7: {
    level: 7,
    name: "Full explanation + transfer check",
    pedagogy: "Direct explanation followed immediately by a transfer check question.",
    allowsDirectAnswer: true,
  },
};

export class HintLadder {
  currentRung: number;
  failedAttemptsOnRung: number = 0;
  turnsOnCurrentRung: number = 0;
  maxFailedBeforeEscalation: number = 2;
  frustrationThreshold: number = 0.7;

  constructor(initialRung: number = 1) {
    this.currentRung = Math.max(1, Math.min(7, initialRung));
  }

  update(params: {
    isSuccess: boolean;
    frustration?: number;
    recommendedRung?: number;
  }): number {
    const { isSuccess, frustration = 0, recommendedRung } = params;

    this.turnsOnCurrentRung += 1;

    // Diagnostician suggestion override (e.g. for complete beginners starting higher or visual escalation)
    if (recommendedRung && (recommendedRung > this.currentRung || recommendedRung === 4)) {
      this.currentRung = Math.min(7, recommendedRung);
      this.failedAttemptsOnRung = 0;
      this.turnsOnCurrentRung = 0;
      return this.currentRung;
    }

    if (isSuccess) {
      this.failedAttemptsOnRung = 0;
      // Scaffolding fading: de-escalate after success
      if (this.currentRung > 1) {
        this.currentRung -= 1;
        this.turnsOnCurrentRung = 0;
      }
      return this.currentRung;
    }

    // Failure / Confusion path
    this.failedAttemptsOnRung += 1;

    const shouldEscalate =
      this.failedAttemptsOnRung >= this.maxFailedBeforeEscalation ||
      frustration >= this.frustrationThreshold ||
      this.turnsOnCurrentRung >= 3;

    if (shouldEscalate && this.currentRung < 7) {
      this.currentRung += 1;
      this.failedAttemptsOnRung = 0;
      this.turnsOnCurrentRung = 0;
    }

    return this.currentRung;
  }

  getRungName(rung: number = this.currentRung): string {
    return RUNG_DEFINITIONS[rung]?.name || "Probe";
  }
}

