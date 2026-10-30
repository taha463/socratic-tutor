"use client";

import React, { useState, useEffect } from "react";

export interface AnimationStep {
  stepNumber: number;
  title: string;
  description: string;
  elements: Array<{
    id: string;
    type: "box" | "circle" | "arrow" | "text" | "stack_frame";
    label: string;
    x: number;
    y: number;
    highlight?: boolean;
    isBlank?: boolean;
  }>;
}

export interface StepAnimationPlayerProps {
  title: string;
  steps: AnimationStep[];
  predictionPrompt: string;
  blankStepIndex?: number;
}

export function StepAnimationPlayer({
  title,
  steps,
  predictionPrompt,
  blankStepIndex = 1,
}: StepAnimationPlayerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const activeStep = steps[currentStepIdx] || steps[0];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

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
          marginBottom: "12px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "15px" }}>{title}</span>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
          Step {activeStep.stepNumber} of {steps.length}
        </span>
      </figcaption>

      {/* Animation Stage */}
      <div
        style={{
          height: "180px",
          position: "relative",
          background: "var(--cotton)",
          borderRadius: "8px",
          border: "1px solid var(--rule-2)",
          overflow: "hidden",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        {activeStep.elements.map((el) => {
          const isBlankElement = el.isBlank && !revealed;
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}px`,
                top: `${el.y}px`,
                padding: "8px 12px",
                borderRadius: "6px",
                background: el.highlight ? "var(--coral-light)" : "var(--paper)",
                border: el.highlight ? "2px solid var(--coral-deep)" : "1px solid var(--rule-2)",
                fontFamily: "var(--font-figure)",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--ink)",
                transition: "all 0.3s ease",
              }}
            >
              {isBlankElement ? "?" : el.label}
            </div>
          );
        })}
      </div>

      {/* Controls & Scrubber */}
      <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>{activeStep.description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={currentStepIdx === 0}
            onClick={() => setCurrentStepIdx((prev) => Math.max(0, prev - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={currentStepIdx === steps.length - 1}
            onClick={() => setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1))}
          >
            Next
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setRevealed(true)}
          >
            Reveal
          </button>
        </div>
      </div>
    </figure>
  );
}

