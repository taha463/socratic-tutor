"use client";

import React, { useState, useEffect } from "react";

export interface SketchRowData {
  row_type: "mapping_pair" | "process_flow" | "annotation_text" | string;
  left_label: string;
  left_box_text: string;
  left_box_color: "pastel_blue" | "pastel_purple" | "none" | string;
  arrow_label: string;
  right_label: string;
  right_box_text: string;
  right_box_color: "pastel_red" | "pastel_green" | "mystery_yellow" | string;
  is_socratic_puzzle: boolean;
  socratic_options: string[];
}

export interface SketchboardData {
  board_window_title: string;
  main_heading: string;
  rows: SketchRowData[];
  footer_summary: string;
  socratic_voice_prompt: string;
}

export interface SketchNotebookProps {
  initialData?: SketchboardData;
  conceptQuery?: string;
  onSolvePuzzle?: (rowIdx: number, selectedOption: string) => void;
}

export function SketchNotebook({
  initialData,
  conceptQuery = "Self-Attention in Transformers",
  onSolvePuzzle,
}: SketchNotebookProps) {
  const [board, setBoard] = useState<SketchboardData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [solvedRows, setSolvedRows] = useState<Record<number, boolean>>({});
  const [activeModalRow, setActiveModalRow] = useState<number | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [celebrationRow, setCelebrationRow] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState(conceptQuery);

  // Fetch from backend API
  const fetchBoard = async (query: string) => {
    setIsLoading(true);
    setSolvedRows({});
    setActiveModalRow(null);
    setWrongAttempt(null);
    try {
      const res = await fetch("/api/sketch-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept_query: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setBoard(data);
      }
    } catch (err) {
      console.error("[SketchNotebook] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData && conceptQuery) {
      fetchBoard(conceptQuery);
    }
  }, [conceptQuery]);

  const handleSelectOption = (rowIdx: number, option: string, expectedAnswer: string) => {
    const cleanOpt = option.trim().toLowerCase();
    const cleanExp = expectedAnswer.trim().toLowerCase();

    // Check match or close match
    if (cleanOpt === cleanExp || cleanExp.includes(cleanOpt) || cleanOpt.includes(cleanExp)) {
      setSolvedRows((prev) => ({ ...prev, [rowIdx]: true }));
      setActiveModalRow(null);
      setWrongAttempt(null);
      setCelebrationRow(rowIdx);
      setTimeout(() => setCelebrationRow(null), 2500);
      onSolvePuzzle?.(rowIdx, option);
    } else {
      setWrongAttempt(`"${option}" is not the missing link. Think about what invariant must hold!`);
    }
  };

  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case "pastel_blue":
        return {
          bg: "#D0E4F7",
          border: "#5B9BD5",
          text: "#2C2C2C",
        };
      case "pastel_purple":
        return {
          bg: "#B4A7D6",
          border: "#674EA7",
          text: "#2C2C2C",
        };
      case "pastel_red":
        return {
          bg: "#F9D5D0",
          border: "#C87A72",
          text: "#2C2C2C",
        };
      case "pastel_green":
        return {
          bg: "#D9EAD3",
          border: "#6AA84F",
          text: "#2C2C2C",
        };
      case "mystery_yellow":
      case "pastel_yellow":
      case "yellow":
        return {
          bg: "#FFF2CC",
          border: "#D4A017",
          text: "#2C2C2C",
        };
      default:
        return {
          bg: "#FFFDFB",
          border: "#D6CCC3",
          text: "#2C2C2C",
        };
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "920px",
        margin: "0 auto",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(44, 44, 44, 0.08), 0 1px 3px rgba(44, 44, 44, 0.05)",
        border: "2px solid #E6E2D8",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#FDFBF7",
      }}
    >
      {/* 1. macOS Style Notebook Window Header */}
      <div
        style={{
          background: "#F2EDE4",
          borderBottom: "2px solid #E6E2D8",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FF5F56", display: "inline-block" }} />
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27C93F", display: "inline-block" }} />
          <span
            className="font-sketch"
            style={{
              marginLeft: "12px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#5C5652",
              letterSpacing: "0.02em",
            }}
          >
            {board?.board_window_title || "SketchSocratic Whiteboard"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "12px",
              background: "#FFF2CC",
              color: "#B45309",
              border: "1px solid #FCD34D",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#D97706" }} />
            80/20 Socratic Board
          </span>
        </div>
      </div>

      {/* Concept Switcher / Live Query Bar */}
      <div
        style={{
          padding: "10px 20px",
          background: "#F9F6F0",
          borderBottom: "1px dashed #E6E2D8",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 280px" }}>
          <span className="font-sketch" style={{ fontSize: "14px", color: "#7A7A7A" }}>
            Sketch Concept:
          </span>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchBoard(customInput)}
            placeholder="e.g. Backpropagation, Recursion, Tokenization, 7B model RAM..."
            className="font-sketch"
            style={{
              flex: 1,
              padding: "4px 12px",
              borderRadius: "8px",
              border: "1.5px solid #D6CCC3",
              background: "#FFFDFB",
              color: "#2C2C2C",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={() => fetchBoard(customInput)}
          disabled={isLoading}
          className="btn btn-sm font-sketch"
          style={{
            background: "#5B9BD5",
            color: "#FFFFFF",
            border: "1.5px solid #3E79B0",
            fontWeight: 700,
            borderRadius: "8px",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "Drawing Board..." : "Draw Socratic Sketch"}
        </button>
      </div>

      {/* 2. Main Canvas Area with Notebook Grid Pattern */}
      <div
        className="sketch-canvas-grid"
        style={{
          padding: "32px 28px",
          minHeight: "440px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "300px",
              gap: "16px",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="#D0E4F7" strokeWidth="4" />
              <path d="M22 4 A18 18 0 0 1 40 22" fill="none" stroke="#5B9BD5" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <p className="font-sketch" style={{ fontSize: "18px", color: "#5C5652", margin: 0 }}>
              The tutor is sketching the notebook whiteboard on &ldquo;{customInput}&rdquo;...
            </p>
          </div>
        ) : board ? (
          <>
            {/* Main Heading with Highlighter Accent */}
            <div style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-4px",
                  bottom: "2px",
                  width: "104%",
                  height: "12px",
                  background: "var(--sketch-highlighter, rgba(226, 192, 125, 0.4))",
                  borderRadius: "4px",
                  transform: "rotate(-0.5deg)",
                  zIndex: 0,
                }}
              />
              <h2
                className="font-sketch"
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#2C2C2C",
                  margin: 0,
                  position: "relative",
                  zIndex: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                {board.main_heading}
              </h2>
            </div>

            {/* Whiteboard Rows (Staggered Hand-Drawn Flow) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {board.rows.map((row, idx) => {
                const isPuzzle = row.is_socratic_puzzle;
                const isSolved = solvedRows[idx];
                const isCelebrating = celebrationRow === idx;
                const leftColors = getColorClasses(row.left_box_color);
                const rightColors = getColorClasses(
                  isSolved ? "pastel_green" : isPuzzle ? "mystery_yellow" : row.right_box_color
                );

                if (row.row_type === "annotation_text") {
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 18px",
                        background: "rgba(226, 192, 125, 0.15)",
                        borderLeft: "4px solid #D4A017",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      <p className="font-sketch" style={{ margin: 0, fontSize: "16px", color: "#2C2C2C", fontStyle: "italic" }}>
                        &ldquo;{row.left_box_text || row.right_box_text}&rdquo;
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      position: "relative",
                      flexWrap: "nowrap",
                    }}
                  >
                    {/* Left Box (Source / Precondition) */}
                    <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span className="font-sketch" style={{ fontSize: "12px", color: "#7A7A7A", fontWeight: 700, textTransform: "uppercase" }}>
                        {row.left_label}
                      </span>
                      <div
                        className="sketch-box font-sketch"
                        style={{
                          padding: "14px 18px",
                          background: leftColors.bg,
                          border: `2px solid ${leftColors.border}`,
                          color: leftColors.text,
                          fontSize: "17px",
                          fontWeight: 600,
                          lineHeight: "1.35",
                          position: "relative",
                        }}
                      >
                        {row.left_box_text}
                      </div>
                    </div>

                    {/* Middle Data Flow Arrow */}
                    <div
                      style={{
                        flex: "0 0 140px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        padding: "0 4px",
                      }}
                    >
                      <span
                        className="font-sketch"
                        style={{
                          fontSize: "12px",
                          color: "#5C5652",
                          fontWeight: 700,
                          textAlign: "center",
                          lineHeight: "1.2",
                          marginBottom: "4px",
                        }}
                      >
                        {row.arrow_label}
                      </span>
                      <svg width="100%" height="28" viewBox="0 0 120 28" fill="none" aria-hidden="true">
                        {/* Hand-drawn wavy arrow path */}
                        <path
                          d="M4 14 Q 30 8, 60 14 T 106 14"
                          stroke="#2C2C2C"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Arrowhead */}
                        <path
                          d="M96 7 L 110 14 L 96 21"
                          stroke="#2C2C2C"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>

                    {/* Right Box (Target / Socratic Mystery Box) */}
                    <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span className="font-sketch" style={{ fontSize: "12px", color: "#7A7A7A", fontWeight: 700, textTransform: "uppercase" }}>
                        {row.right_label}
                      </span>

                      {isPuzzle && !isSolved ? (
                        /* Socratic Mystery Box [ ? ] */
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalRow(idx);
                            setWrongAttempt(null);
                          }}
                          className="sketch-box sketch-box-pulse font-sketch"
                          style={{
                            padding: "14px 18px",
                            background: "#FFF2CC",
                            border: "2.5px dashed #D4A017",
                            color: "#854D0E",
                            fontSize: "17px",
                            fontWeight: 700,
                            lineHeight: "1.35",
                            cursor: "pointer",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              background: "#D4A017",
                              color: "#FFFFFF",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              fontWeight: 900,
                            }}
                          >
                            ?
                          </span>
                          <span>[ ? ] Socratic Mystery Box — Click to Solve</span>
                        </button>
                      ) : (
                        /* Standard or Unlocked Box */
                        <div
                          className="sketch-box font-sketch"
                          style={{
                            padding: "14px 18px",
                            background: rightColors.bg,
                            border: `2px solid ${rightColors.border}`,
                            color: rightColors.text,
                            fontSize: "17px",
                            fontWeight: 600,
                            lineHeight: "1.35",
                            transition: "all 0.4s ease",
                            transform: isCelebrating ? "scale(1.03)" : "none",
                            boxShadow: isCelebrating
                              ? "0 0 16px rgba(106, 168, 79, 0.4)"
                              : "2px 3px 0px rgba(44, 44, 44, 0.15)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <span>{row.right_box_text}</span>
                            {isSolved && (
                              <span
                                style={{
                                  background: "#6AA84F",
                                  color: "#FFFFFF",
                                  fontSize: "12px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                }}
                              >
                                ✓ SOLVED
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Footer Summary Callout */}
            {board.footer_summary && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "16px 20px",
                  background: "#FFFDFB",
                  borderRadius: "12px",
                  border: "2px solid #E6E2D8",
                  position: "relative",
                  boxShadow: "2px 3px 0px rgba(44, 44, 44, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px" }}>💡</span>
                  <span className="font-sketch" style={{ fontSize: "14px", fontWeight: 700, color: "#7A7A7A", textTransform: "uppercase" }}>
                    Teacher Blackboard Summary
                  </span>
                </div>
                <p className="font-sketch" style={{ margin: 0, fontSize: "16px", color: "#2C2C2C", lineHeight: "1.45" }}>
                  {board.footer_summary}
                </p>
              </div>
            )}

            {/* 4. Socratic Voice Prompt */}
            {board.socratic_voice_prompt && (
              <div
                style={{
                  padding: "14px 18px",
                  background: "#FFF2CC",
                  borderRadius: "12px",
                  border: "2px solid #FCD34D",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "20px", flexShrink: 0 }}>🎙️</span>
                <div>
                  <div className="font-sketch" style={{ fontSize: "13px", fontWeight: 700, color: "#92400E", textTransform: "uppercase", marginBottom: "2px" }}>
                    Socratic Prompt for You
                  </div>
                  <p className="font-sketch" style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#78350F" }}>
                    {board.socratic_voice_prompt}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Socratic Mystery Box Solution Modal */}
      {activeModalRow !== null && board && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(44, 44, 44, 0.4)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setActiveModalRow(null)}
        >
          <div
            className="sketch-canvas-grid"
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#FDFBF7",
              borderRadius: "16px",
              border: "3px solid #2C2C2C",
              padding: "24px",
              boxShadow: "6px 8px 0px #2C2C2C",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>🧩</span>
                <h3 className="font-sketch" style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#2C2C2C" }}>
                  Solve the Socratic Mystery Box
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalRow(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#7A7A7A",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <p className="font-sketch" style={{ margin: "0 0 16px", fontSize: "15px", color: "#5C5652" }}>
              The tutor drew the source element:{" "}
              <strong style={{ color: "#2C2C2C" }}>
                &ldquo;{board.rows[activeModalRow].left_box_text}&rdquo;
              </strong>{" "}
              transforming via{" "}
              <strong style={{ color: "#2C2C2C" }}>
                &ldquo;{board.rows[activeModalRow].arrow_label}&rdquo;
              </strong>
              . What belongs in the mystery target box?
            </p>

            {/* Options list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {board.rows[activeModalRow].socratic_options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() =>
                    handleSelectOption(
                      activeModalRow,
                      opt,
                      board.rows[activeModalRow].right_box_text
                    )
                  }
                  className="font-sketch sketch-box"
                  style={{
                    padding: "12px 16px",
                    background: "#FFFDFB",
                    border: "2px solid #2C2C2C",
                    borderRadius: "8px",
                    color: "#2C2C2C",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#D0E4F7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFDFB";
                  }}
                >
                  <span>{opt}</span>
                  <span style={{ fontSize: "14px", color: "#7A7A7A" }}>→ Select</span>
                </button>
              ))}
            </div>

            {/* Feedback message */}
            {wrongAttempt && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#F9D5D0",
                  border: "1.5px solid #C87A72",
                  borderRadius: "8px",
                  color: "#B93E29",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
                className="font-sketch"
              >
                {wrongAttempt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

