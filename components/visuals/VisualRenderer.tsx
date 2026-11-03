"use client";

import React, { useState } from "react";
import { PlotViewer } from "./PlotViewer";
import { StepAnimationPlayer } from "./StepAnimationPlayer";
import { SketchNotebook } from "./SketchNotebook";
import { LiveCodeSandbox } from "../sandbox/LiveCodeSandbox";

export interface VisualRendererProps {
  visualSpec: Record<string, any>;
  onPredictionSubmit?: (prediction: string) => void;
}

export function VisualRenderer({ visualSpec, onPredictionSubmit }: VisualRendererProps) {
  const [prediction, setPrediction] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!visualSpec || typeof visualSpec !== "object") {
    return null;
  }

  const skill = (visualSpec.skill || visualSpec.chosenSkill || visualSpec.type || "").toLowerCase();
  const concept = visualSpec.concept || visualSpec.title || "Visual Concept";
  const prompt =
    visualSpec.prompt ||
    visualSpec.predictionPrompt ||
    visualSpec.mappingQuestion ||
    "What goes in the blank?";

  // Expected answer or blank target
  const expected = (
    visualSpec.expectedOutput ||
    visualSpec.blankTarget ||
    (visualSpec.blanks && visualSpec.blanks[0]) ||
    visualSpec.answer ||
    ""
  ).toString().trim();

  const handleCheck = () => {
    if (!prediction.trim()) return;
    const cleanPred = prediction.trim().toLowerCase();
    const cleanExp = expected.toLowerCase().replace(/[\?\!\[\]\_]/g, "").trim();

    if (cleanExp && (cleanPred.includes(cleanExp) || cleanExp.includes(cleanPred))) {
      setFeedback("Spot on! Your prediction matches the invariant.");
      setIsRevealed(true);
    } else {
      setFeedback("Good attempt. Check the relationship and try revealing to verify.");
    }

    if (typeof onPredictionSubmit === "function") {
      onPredictionSubmit(prediction);
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
    if (!feedback) {
      setFeedback("Scaffold revealed. Observe how this connects to the core question.");
    }
  };

  // 0. SKETCHBOARD / SKETCHSOCRATIC (Hand-Drawn Notebook)
  if (skill === "sketch" || skill === "sketchboard" || Array.isArray(visualSpec.rows)) {
    return (
      <SketchNotebook
        initialData={visualSpec.rows ? (visualSpec as any) : undefined}
        conceptQuery={concept}
        onSolvePuzzle={(_idx, option) => {
          if (typeof onPredictionSubmit === "function") {
            onPredictionSubmit(option);
          }
        }}
      />
    );
  }

  // 1. COMPLEXITY PLOT
  if (skill === "plot" || visualSpec.plotType) {
    return (
      <PlotViewer
        concept={concept}
        plotType={visualSpec.plotType || "big_o"}
        blankTarget={visualSpec.blankTarget || "O(n)"}
        predictionPrompt={prompt}
        onAnswer={(ans) => {
          setPrediction(ans);
          handleCheck();
        }}
      />
    );
  }

  // 2. STEP ANIMATION
  if (skill === "animate" || Array.isArray(visualSpec.steps)) {
    return (
      <StepAnimationPlayer
        title={visualSpec.title || concept}
        steps={visualSpec.steps || []}
        predictionPrompt={prompt}
        blankStepIndex={visualSpec.blankStepIndex ?? 1}
      />
    );
  }

  // 3. CODE TRACE & LIVE PYTHON SANDBOX
  if (skill === "trace" || skill === "sandbox" || visualSpec.code) {
    return (
      <div style={{ margin: "10px 0", width: "100%", maxWidth: "920px" }}>
        <LiveCodeSandbox
          initialCode={visualSpec.code}
          topic={concept}
          onAskTutor={(question) => {
            if (typeof onPredictionSubmit === "function") {
              onPredictionSubmit(question);
            }
          }}
        />
      </div>
    );
  }

  // 4. EVERYDAY ANALOGY / ELI5
  if (skill === "eli5" || skill === "analogy" || visualSpec.analogy) {
    return (
      <figure
        style={{
          margin: 0,
          padding: "20px",
          border: "1px solid var(--rule)",
          borderRadius: "12px",
          background: "var(--cotton)",
          maxWidth: "560px",
          boxSizing: "border-box",
        }}
      >
        <figcaption
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--ink)" }}>
            Everyday Analogy: <span style={{ color: "var(--coral-deep)" }}>{concept}</span>
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "4px",
              background: "var(--coral-light)",
              color: "var(--coral-deep)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Mental Model
          </span>
        </figcaption>

        <blockquote
          style={{
            margin: "0 0 16px",
            padding: "14px 16px",
            borderLeft: "4px solid var(--coral)",
            background: "var(--paper)",
            borderRadius: "0 8px 8px 0",
            fontStyle: "italic",
            fontSize: "15px",
            lineHeight: "1.5",
            color: "var(--ink)",
          }}
        >
          &ldquo;{visualSpec.analogy}&rdquo;
        </blockquote>

        <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
          <strong style={{ color: "var(--coral-deep)" }}>Mapping Challenge: </strong>
          {prompt}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <input
            type="text"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Your mapping prediction..."
            className="fig"
            style={{
              flex: "1 1 200px",
              minHeight: "38px",
              padding: "0 12px",
              border: "1px solid var(--muted)",
              borderRadius: "6px",
              background: "var(--cotton)",
              color: "var(--ink)",
              fontSize: "13px",
            }}
          />
          <button className="btn btn-sm" type="button" onClick={handleCheck}>
            Check
          </button>
          <button className="btn btn-sm" type="button" onClick={handleReveal}>
            Reveal
          </button>
        </div>

        {isRevealed && expected && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "var(--paper)", borderRadius: "6px", border: "1px dashed var(--coral-deep)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--coral-deep)" }}>Mapping Key: </span>
            <span style={{ fontSize: "13px" }}>{expected}</span>
          </div>
        )}

        {feedback && (
          <p style={{ margin: "10px 0 0", color: "var(--coral-deep)", fontSize: "13px", fontWeight: 500 }}>
            {feedback}
          </p>
        )}
      </figure>
    );
  }

  // 5. CALL STACK (Recursion specific)
  if (skill === "call_stack" || (concept.toLowerCase().includes("recursion") && visualSpec.type === "call_stack")) {
    return (
      <figure
        style={{
          margin: 0,
          padding: "20px",
          border: "1px solid var(--rule)",
          borderRadius: "12px",
          background: "var(--paper)",
          maxWidth: "560px",
          boxSizing: "border-box",
        }}
      >
        <figcaption
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontWeight: 600 }}>Call Stack Frames: {concept}</span>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>Predict the base frame return</span>
        </figcaption>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr auto",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              background: "var(--cotton)",
              border: "1px solid var(--rule-2)",
              borderRadius: "8px",
            }}
          >
            <span className="fig" style={{ fontWeight: 500 }}>Caller frame</span>
            <span style={{ color: "var(--muted)" }}>waits for child execution</span>
            <span className="fig" style={{ color: "var(--muted)" }}>depth = 2</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr auto",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              marginLeft: "24px",
              background: "var(--cotton)",
              border: "2px solid var(--coral)",
              borderRadius: "8px",
            }}
          >
            <span className="fig" style={{ fontWeight: 500 }}>Base frame</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "var(--muted)" }}>
              returns{" "}
              <span
                className="fig"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "48px",
                  height: "28px",
                  padding: "0 8px",
                  border: "2px dashed var(--coral-deep)",
                  borderRadius: "6px",
                  color: "var(--coral-deep)",
                  fontWeight: 600,
                }}
              >
                {isRevealed ? (expected || "1") : "?"}
              </span>
            </span>
            <span className="fig" style={{ color: "var(--muted)" }}>depth = 1</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginTop: "16px" }}>
          <input
            type="text"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Prediction..."
            className="fig"
            style={{
              width: "90px",
              minHeight: "38px",
              padding: "0 10px",
              border: "1px solid var(--muted)",
              borderRadius: "6px",
              background: "var(--cotton)",
              fontSize: "13px",
            }}
          />
          <button className="btn btn-sm" type="button" onClick={handleCheck}>Check</button>
          <button className="btn btn-sm" type="button" onClick={handleReveal}>Reveal</button>
        </div>
        {feedback && (
          <p style={{ margin: "10px 0 0", color: "var(--coral-deep)", fontSize: "13px", fontWeight: 500 }}>
            {feedback}
          </p>
        )}
      </figure>
    );
  }

  // 6. DIAGRAM / FLOWCHART / TABLE / GENERAL VISUAL SCAFFOLD
  const mermaidRaw = visualSpec.mermaidSource || "";
  const lines = mermaidRaw
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l && !l.startsWith("graph") && !l.startsWith("flowchart"));

  return (
    <figure
      style={{
        margin: 0,
        padding: "20px",
        border: "1px solid var(--rule)",
        borderRadius: "12px",
        background: "var(--paper)",
        maxWidth: "560px",
        boxSizing: "border-box",
      }}
    >
      <figcaption
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--ink)" }}>
          Visual Scaffold: <span style={{ color: "var(--coral-deep)" }}>{concept}</span>
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: "4px",
            background: "var(--coral-light)",
            color: "var(--coral-deep)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {skill || "Structure"}
        </span>
      </figcaption>

      {/* Structural Nodes or Steps */}
      {lines.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
          {lines.map((line: string, idx: number) => {
            const hasBlank =
              line.includes("?BLANK?") ||
              line.includes("[?]") ||
              line.includes("???") ||
              line.includes("?");

            return (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  background: "var(--cotton)",
                  border: hasBlank ? "2px dashed var(--coral)" : "1px solid var(--rule-2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  gap: "12px",
                }}
              >
                <span className="fig" style={{ fontWeight: 500, color: "var(--ink)" }}>
                  {line.replace(/\?BLANK\?/g, isRevealed ? (expected || "Target") : "[ ? ]")}
                </span>
                {hasBlank && !isRevealed && (
                  <span
                    className="fig"
                    style={{
                      background: "var(--coral-light)",
                      color: "var(--coral-deep)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    BLANK
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "14px",
            background: "var(--cotton)",
            borderRadius: "8px",
            border: "1px solid var(--rule-2)",
            marginBottom: "14px",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>
            {visualSpec.description || visualSpec.summary || "Explore the structural relationship below."}
          </p>
        </div>
      )}

      {/* Prediction Prompt */}
      <p style={{ margin: "14px 0 10px", fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
        <strong style={{ color: "var(--coral-deep)" }}>Prediction Prompt: </strong>
        {prompt}
      </p>

      {/* Input controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <input
          type="text"
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Predict the missing piece..."
          className="fig"
          style={{
            flex: "1 1 200px",
            minHeight: "38px",
            padding: "0 12px",
            border: "1px solid var(--muted)",
            borderRadius: "6px",
            background: "var(--cotton)",
            color: "var(--ink)",
            fontSize: "13px",
          }}
        />
        <button className="btn btn-sm" type="button" onClick={handleCheck}>
          Check
        </button>
        <button className="btn btn-sm" type="button" onClick={handleReveal}>
          Reveal
        </button>
      </div>

      {isRevealed && expected && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "var(--cotton)",
            borderRadius: "6px",
            border: "1px solid var(--coral)",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--coral-deep)" }}>
            Revealed Value:{" "}
          </span>
          <span className="fig" style={{ fontSize: "13px" }}>
            {expected}
          </span>
        </div>
      )}

      {feedback && (
        <p style={{ margin: "10px 0 0", color: "var(--coral-deep)", fontSize: "13px", fontWeight: 500 }}>
          {feedback}
        </p>
      )}
    </figure>
  );
}

