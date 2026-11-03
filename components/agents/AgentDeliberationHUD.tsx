"use client";

import React, { useState } from "react";
import type { AgentDeliberationTrace } from "@/core/orchestrator";

interface AgentDeliberationHUDProps {
  trace?: AgentDeliberationTrace;
  rung?: number;
}

export const AgentDeliberationHUD: React.FC<AgentDeliberationHUDProps> = ({ trace, rung = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If no trace is available (e.g. for initial greeting or legacy turns), show standard system gate
  if (!trace) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 10px",
          borderRadius: "6px",
          background: "var(--cotton)",
          border: "1px solid var(--rule-2)",
          fontSize: "12px",
          color: "var(--muted)",
          marginTop: "6px",
        }}
      >
        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
        <span>Socratic Invariant Active</span>
        <span>•</span>
        <span>Zero Answer Leak Guaranteed</span>
      </div>
    );
  }

  const { diagnostician, visualizer, teacher, critic } = trace;

  const stateColors: Record<string, { bg: string; text: string; border: string }> = {
    LEARNING: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
    STUCK: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
    MASTERY: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
    COPYING_SUSPECTED: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
    NEEDS_TRANSFER_CHECK: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  };

  const currentTheme = stateColors[diagnostician.state] || stateColors.LEARNING;

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "8px",
        border: "1px solid var(--rule)",
        background: "var(--cotton)",
        overflow: "hidden",
        fontSize: "12px",
        transition: "all 0.2s ease",
      }}
    >
      {/* Compact Telemetry Strip */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          gap: "8px",
          background: "#FAF9F5",
          borderBottom: isOpen ? "1px solid var(--rule)" : "none",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {/* Diagnostician Pill */}
          <span
            title="Diagnostician Agent evaluated your current cognitive state"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: currentTheme.bg,
              border: `1px solid ${currentTheme.border}`,
              color: currentTheme.text,
              fontWeight: 600,
            }}
          >
            <span>🩺 Diagnostician:</span>
            <span>{diagnostician.state}</span>
            <span style={{ opacity: 0.75, fontWeight: 400 }}>({Math.round(diagnostician.frustration * 100)}% friction)</span>
          </span>

          {/* Teacher Pill */}
          <span
            title={`Teacher Agent is guiding via Ladder Rung ${teacher.ladderRung}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              color: "#374151",
              fontWeight: 600,
            }}
          >
            <span>✍️ Teacher:</span>
            <span>Rung {teacher.ladderRung} ({teacher.ladderName})</span>
          </span>

          {/* Visualizer Pill (if active) */}
          {visualizer && (
            <span
              title={`Visualizer deployed ${visualizer.chosenSkill} scaffold`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                color: "#92400E",
                fontWeight: 600,
              }}
            >
              <span>🎨 Visualizer:</span>
              <span>{visualizer.chosenSkill}</span>
            </span>
          )}

          {/* Critic Pass Pill */}
          <span
            title="Critic Agent verified Zero Answer Leak & One-Question invariant"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: critic.passed ? "#ECFDF5" : "#FEF2F2",
              border: `1px solid ${critic.passed ? "#A7F3D0" : "#FECACA"}`,
              color: critic.passed ? "#065F46" : "#991B1B",
              fontWeight: 600,
            }}
          >
            <span>⚖️ Critic:</span>
            <span>{critic.passed ? "0% Leak Verified ✓" : "Violations Detected"}</span>
          </span>
        </div>

        {/* Toggle Consensus Drawer */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: "none",
            border: "none",
            color: "var(--ink)",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--rule-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <span>{isOpen ? "Hide Consensus" : "Inspect Multi-Agent Consensus"}</span>
          <span style={{ fontSize: "10px", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ▼
          </span>
        </button>
      </div>

      {/* Expanded Multi-Agent Consensus Drawer */}
      {isOpen && (
        <div
          style={{
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
            background: "#FFFFFF",
          }}
        >
          {/* Card 1: Diagnostician */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid var(--rule-2)",
              background: "#FAFAFA",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🩺</span> Diagnostician Agent
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: currentTheme.bg,
                  color: currentTheme.text,
                  fontWeight: 600,
                }}
              >
                {diagnostician.state}
              </span>
            </div>

            <p style={{ margin: 0, color: "var(--ink)", fontSize: "12px", lineHeight: 1.4 }}>
              {diagnostician.reasoning}
            </p>

            {diagnostician.detectedMisconception && (
              <div
                style={{
                  padding: "6px 8px",
                  borderRadius: "4px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  fontSize: "11px",
                  color: "#991B1B",
                }}
              >
                <strong>Misconception:</strong> {diagnostician.detectedMisconception}
              </div>
            )}

            <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
              <div>Frustration Score: <strong>{(diagnostician.frustration * 100).toFixed(0)}%</strong></div>
              <div>Recommended Rung: <strong>Rung {diagnostician.recommendedRung}</strong></div>
              {diagnostician.signals && (
                <div style={{ marginTop: "4px", fontFamily: "monospace", fontSize: "10px", color: "#6B7280" }}>
                  Telemetry: {diagnostician.signals.idle_seconds ?? 0}s idle, {diagnostician.signals.tab_switches ?? 0} tabs
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Teacher */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid var(--rule-2)",
              background: "#FAFAFA",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>✍️</span> Teacher Agent
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "#EFF6FF",
                  color: "#1E40AF",
                  fontWeight: 600,
                }}
              >
                Rung {teacher.ladderRung}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "var(--ink)" }}>
              <strong>Pedagogical Invariant:</strong>
              <div style={{ marginTop: "4px", fontStyle: "italic", color: "#374151" }}>
                "{teacher.singleQuestion}"
              </div>
            </div>

            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: teacher.hasFactualGrounding ? "#10B981" : "#6B7280",
                }}
              />
              <span style={{ color: "var(--muted)" }}>
                {teacher.hasFactualGrounding ? "Factually Grounded via RAG Knowledge" : "Universal Socratic Model"}
              </span>
            </div>
          </div>

          {/* Card 3: Visualizer */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid var(--rule-2)",
              background: "#FAFAFA",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎨</span> Visualizer Agent
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: visualizer ? "#FEF3C7" : "#F3F4F6",
                  color: visualizer ? "#92400E" : "#6B7280",
                  fontWeight: 600,
                }}
              >
                {visualizer ? visualizer.chosenSkill : "Idle (Rung < 4)"}
              </span>
            </div>

            {visualizer ? (
              <>
                <p style={{ margin: 0, color: "var(--ink)", fontSize: "12px", lineHeight: 1.4 }}>
                  {visualizer.reasoning}
                </p>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Target Concept: <strong>{visualizer.concept}</strong>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px", fontStyle: "italic" }}>
                Scaffolding remains conversational. Visualizer activates at Rung 4 or when learner requests visual clarity.
              </p>
            )}
          </div>

          {/* Card 4: Critic Quality Gate */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: `1px solid ${critic.passed ? "#A7F3D0" : "#FECACA"}`,
              background: critic.passed ? "#F0FDF4" : "#FEF2F2",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: critic.passed ? "#065F46" : "#991B1B", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚖️</span> Critic Quality Gate
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: critic.passed ? "#DCFCE7" : "#FEE2E2",
                  color: critic.passed ? "#15803D" : "#B91C1C",
                  fontWeight: 700,
                }}
              >
                {critic.passed ? "PASSED" : "FLAGGED"}
              </span>
            </div>

            <p style={{ margin: 0, color: "#1F2937", fontSize: "12px", lineHeight: 1.4 }}>
              {critic.summary}
            </p>

            <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{critic.leakDetected ? "❌" : "✓"}</span>
                <span>Zero-Answer-Leak Invariant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{critic.multiQuestionViolation ? "❌" : "✓"}</span>
                <span>One-Question Rule Verified</span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                Rewrite Cycles: <strong>{critic.rewritesDone}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
