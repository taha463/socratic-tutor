"use client";

import React, { useState } from "react";

export interface PlotViewerProps {
  concept: string;
  plotType?: "big_o" | "gradient_descent" | "binary_search" | "custom";
  blankTarget: string;
  predictionPrompt: string;
  onAnswer?: (answer: string) => void;
}

export function PlotViewer({
  concept,
  plotType = "big_o",
  blankTarget,
  predictionPrompt,
  onAnswer,
}: PlotViewerProps) {
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    setRevealed(true);
    onAnswer?.(guess);
  };

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
        <span style={{ fontWeight: 600, fontSize: "15px" }}>Complexity Curves: {concept}</span>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Predict the blank curve</span>
      </figcaption>

      {/* SVG Plot */}
      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label="Algorithmic complexity curves plot"
        style={{ width: "100%", height: "auto", display: "block", background: "var(--cotton)", borderRadius: "8px", border: "1px solid var(--rule-2)" }}
      >
        {/* Axes */}
        <line x1="40" y1="20" x2="40" y2="150" stroke="#6B5F59" strokeWidth="1.5" />
        <line x1="40" y1="150" x2="300" y2="150" stroke="#6B5F59" strokeWidth="1.5" />
        <text x="35" y="165" fontSize="11" fontFamily="Geist Mono" fill="#6B5F59">0</text>
        <text x="290" y="165" fontSize="11" fontFamily="Geist Mono" fill="#6B5F59">n</text>
        <text x="15" y="25" fontSize="11" fontFamily="Geist Mono" fill="#6B5F59">Ops</text>

        {/* O(1) - Constant */}
        <line x1="40" y1="130" x2="280" y2="130" stroke="#6B5F59" strokeWidth="2" />
        <text x="285" y="133" fontSize="11" fontFamily="Geist Mono" fill="#6B5F59">O(1)</text>

        {/* O(n) - Linear */}
        <line x1="40" y1="140" x2="260" y2="40" stroke="#E8725A" strokeWidth="2" />
        <text x="265" y="45" fontSize="11" fontFamily="Geist Mono" fill="#E8725A">O(n)</text>

        {/* O(n^2) or Blank curve */}
        <path
          d="M 40 148 Q 180 140 240 30"
          fill="none"
          stroke="#B93E29"
          strokeWidth="2.5"
          strokeDasharray={revealed ? "none" : "5 5"}
        />
        <text x="245" y="32" fontSize="12" fontFamily="Geist Mono" fontWeight="600" fill="#B93E29">
          {revealed ? blankTarget : "?"}
        </text>
      </svg>

      <form onSubmit={handleSubmit} style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>{predictionPrompt}</p>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="e.g. O(n^2)"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="fig"
            style={{
              padding: "0 10px",
              minHeight: "36px",
              border: "1px solid var(--rule-2)",
              borderRadius: "6px",
              background: "var(--cotton)",
              fontSize: "13px",
              width: "120px",
            }}
          />
          <button type="submit" className="btn btn-sm btn-primary">Check</button>
          <button type="button" className="btn btn-sm" onClick={() => setRevealed(true)}>Reveal</button>
        </div>
      </form>
    </figure>
  );
}
