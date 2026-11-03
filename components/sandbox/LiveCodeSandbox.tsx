"use client";

import React, { useState } from "react";
import {
  Play,
  SkipBack,
  SkipForward,
  RotateCcw,
  Edit3,
  Lightbulb,
} from "lucide-react";
import type { PythonTraceStep } from "@/skills/trace/pythonSandbox";

export interface LiveCodeSandboxProps {
  initialCode?: string;
  topic?: string;
  onAskTutor?: (questionContext: string) => void;
}

const TEMPLATES: Record<string, string> = {
  recursion: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(3)
print("Result is:", result)`,

  binary_search: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

items = [2, 5, 8, 12, 16, 23, 38]
idx = binary_search(items, 16)
print("Found at index:", idx)`,

  fibonacci: `def fib(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    return fib(n - 1) + fib(n - 2)

ans = fib(4)
print("fib(4) =", ans)`,
};

export const LiveCodeSandbox: React.FC<LiveCodeSandboxProps> = ({
  initialCode,
  topic = "recursion",
  onAskTutor,
}) => {
  const defaultSnippet =
    initialCode ||
    TEMPLATES[topic.toLowerCase()] ||
    TEMPLATES.recursion;

  const [code, setCode] = useState(defaultSnippet);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<PythonTraceStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(topic.toLowerCase());

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, maxSteps: 300 }),
      });
      const data = await res.json();
      if (!data.success && data.error) {
        setError(data.error);
        setSteps(data.steps || []);
        setStdout(data.stdout || "");
      } else {
        setSteps(data.steps || []);
        setCurrentStepIdx(0);
        setStdout(data.stdout || "");
        if (data.timedOut) {
          setError("Step limit or timeout reached. Infinite loop prevented.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to execute sandbox.");
    } finally {
      setIsRunning(false);
    }
  };

  const currentStep = steps[currentStepIdx];
  const codeLines = code.split("\n");

  const handleTemplateChange = (tmplKey: string) => {
    setSelectedTemplate(tmplKey);
    if (TEMPLATES[tmplKey]) {
      setCode(TEMPLATES[tmplKey]);
      setSteps([]);
      setCurrentStepIdx(0);
      setStdout("");
      setError(null);
    }
  };

  const handleAskAboutState = () => {
    if (!onAskTutor) return;
    if (!currentStep) {
      onAskTutor(`Tutor, can you look at my code snippet and guide my understanding without giving away the answer?\n\n\`\`\`python\n${code}\n\`\`\``);
      return;
    }
    const localsSummary = Object.entries(currentStep.locals)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");
    const ctx = `Tutor, I am stepping through my Python code in the sandbox.
At Step ${currentStep.step} (Line ${currentStep.line}: \`${currentStep.code}\`), the variables currently hold: [${localsSummary}].
Can you ask me a Socratic question to test if I understand why the program reached this state?`;
    onAskTutor(ctx);
  };

  const displayTitle = topic && topic.toLowerCase() !== "general"
    ? `${topic.charAt(0).toUpperCase() + topic.slice(1)} · Python Trace Sandbox`
    : "Python 3.14 · Trace Sandbox";

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
        backgroundImage: "linear-gradient(to right, rgba(44, 44, 44, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(44, 44, 44, 0.04) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        color: "#2B2320",
        boxSizing: "border-box",
      }}
    >
      {/* 1. macOS Style Notebook Window Header */}
      <div
        style={{
          background: "#F2EDE4",
          borderBottom: "2px solid #E6E2D8",
          padding: "10px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          userSelect: "none",
        }}
      >
        {/* Left: 3 macOS dots + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FF5F56", display: "inline-block" }} />
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27C93F", display: "inline-block" }} />
          <span
            style={{
              marginLeft: "12px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "14px",
              fontWeight: 700,
              color: "#5C5652",
              letterSpacing: "0.02em",
            }}
          >
            {displayTitle}
          </span>
        </div>

        {/* Right: 80/20 Rule Badge, Template Selector & System Theme Run Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
            80/20 Socratic Rule
          </span>

          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              background: "#FFFDFB",
              color: "#2B2320",
              border: "1.5px solid #D6CCC3",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="recursion">Template: Factorial</option>
            <option value="binary_search">Template: Binary Search</option>
            <option value="fibonacci">Template: Fibonacci</option>
          </select>

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              borderRadius: "6px",
              background: isRunning ? "#9CA3AF" : "#B93E29", // System Coral-Deep Primary
              border: "none",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              cursor: isRunning ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 2px 6px rgba(185, 62, 41, 0.25)",
            }}
          >
            <Play size={13} fill="currentColor" />
            <span>{isRunning ? "Running..." : "Run & Trace"}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace (Code Editor / Trace + State Stepper) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          minHeight: "320px",
        }}
      >
        {/* Left: Code Box with Socratic Active Line Highlight */}
        <div
          style={{
            borderRight: "2px solid #E6E2D8",
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
          }}
        >
          {/* Subheader */}
          <div
            style={{
              padding: "8px 14px",
              borderBottom: "1px solid #E6E2D8",
              background: "#FAF7F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6B5F59", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Code
            </span>
            {steps.length > 0 && (
              <button
                type="button"
                onClick={() => setSteps([])}
                style={{
                  background: "none",
                  border: "none",
                  color: "#B93E29",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Edit3 size={12} />
                <span>Edit Code</span>
              </button>
            )}
          </div>

          {/* Stepper Active Line Display */}
          {steps.length > 0 ? (
            <div
              style={{
                padding: "12px 14px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "13px",
                lineHeight: "22px",
                overflowX: "auto",
                background: "#FFFFFF",
                flex: 1,
              }}
            >
              {codeLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isCurrent = currentStep?.line === lineNum;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      background: isCurrent ? "#FFF2CC" : "transparent",
                      borderLeft: isCurrent ? "3px solid #D4A017" : "3px solid transparent",
                      paddingLeft: "8px",
                      borderRadius: "3px",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        textAlign: "right",
                        marginRight: "12px",
                        color: isCurrent ? "#854D0E" : "#8C827A",
                        fontWeight: isCurrent ? 700 : 400,
                        userSelect: "none",
                      }}
                    >
                      {lineNum}
                    </span>
                    <span
                      style={{
                        whiteSpace: "pre",
                        color: isCurrent ? "#854D0E" : "#2B2320",
                        fontWeight: isCurrent ? 700 : 400,
                      }}
                    >
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write Python code here..."
              spellCheck={false}
              style={{
                width: "100%",
                flex: 1,
                minHeight: "260px",
                padding: "14px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "13px",
                lineHeight: "22px",
                background: "#FFFFFF",
                color: "#2B2320",
                border: "none",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        {/* Right: Step Navigator & State Inspector */}
        <div
          style={{
            background: "rgba(253, 251, 247, 0.9)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Stepper Controls Bar */}
          {steps.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "1.5px solid #E6E2D8",
                boxShadow: "0 2px 6px rgba(44, 44, 44, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
                  disabled={currentStepIdx === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    background: "#FFFDFB",
                    border: "1.5px solid #D6CCC3",
                    color: currentStepIdx === 0 ? "#A8A29E" : "#2B2320",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: currentStepIdx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <SkipBack size={12} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
                  disabled={currentStepIdx === steps.length - 1}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 14px",
                    borderRadius: "6px",
                    background: currentStepIdx === steps.length - 1 ? "#A8A29E" : "#B93E29", // System Coral-Deep Primary
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: currentStepIdx === steps.length - 1 ? "not-allowed" : "pointer",
                    boxShadow: currentStepIdx === steps.length - 1 ? "none" : "0 2px 6px rgba(185, 62, 41, 0.2)",
                  }}
                >
                  <span>Next</span>
                  <SkipForward size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(0)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: "#FFFDFB",
                    border: "1.5px solid #D6CCC3",
                    color: "#6B5F59",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>

              <div style={{ fontSize: "12px", color: "#B93E29", fontWeight: 700 }}>
                Step {currentStepIdx + 1} of {steps.length} (Line {currentStep?.line})
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "2px dashed #D6CCC3",
                textAlign: "center",
                color: "#6B5F59",
                fontSize: "13px",
              }}
            >
              Click <strong>&quot;Run &amp; Trace&quot;</strong> to step through execution lines and inspect local variables.
            </div>
          )}

          {/* Active Local Variables Table (Matching Pastel Blue Card) */}
          {currentStep && (
            <div
              style={{
                borderRadius: "8px",
                border: "1.5px solid #E6E2D8",
                background: "#FFFFFF",
                padding: "14px",
                boxShadow: "0 2px 8px rgba(44, 44, 44, 0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                  fontSize: "11px",
                  color: "#6B5F59",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                <span>Memory State (Locals)</span>
                <span style={{ fontFamily: "monospace", color: "#B93E29" }}>Frame: {currentStep.function}()</span>
              </div>

              {Object.keys(currentStep.locals).length === 0 ? (
                <div style={{ fontSize: "12px", color: "#8C827A", fontStyle: "italic" }}>
                  No local variables initialized yet in this scope.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {Object.entries(currentStep.locals).map(([name, val]) => (
                    <div
                      key={name}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "#D0E4F7", // Pastel Blue from the Whiteboard Design
                        border: "1.5px solid #5B9BD5",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#1E40AF", fontWeight: 700 }}>{name}</span>
                      <span style={{ color: "#1E3A8A", fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Errors / Warnings */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                background: "#FEE2E2",
                border: "1.5px solid #F87171",
                color: "#991B1B",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <strong>Sandbox Alert:</strong> {error}
            </div>
          )}

          {/* Standard Output Console */}
          {stdout && (
            <div
              style={{
                borderRadius: "8px",
                border: "1.5px solid #E6E2D8",
                background: "#FFFFFF",
                padding: "12px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "12px",
                boxShadow: "0 2px 6px rgba(44, 44, 44, 0.03)",
              }}
            >
              <div style={{ color: "#8C827A", marginBottom: "4px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                Standard Output:
              </div>
              <pre style={{ margin: 0, color: "#15803D", whiteSpace: "pre-wrap", fontWeight: 600 }}>{stdout}</pre>
            </div>
          )}

          {/* Ask Socratic Tutor Bridge Button (System Primary Coral) */}
          {onAskTutor && (
            <button
              type="button"
              onClick={handleAskAboutState}
              style={{
                marginTop: "auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "8px",
                background: "#B93E29", // System Coral-Deep
                border: "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(185, 62, 41, 0.25)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#A33420";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#B93E29";
              }}
            >
              <Lightbulb size={15} />
              <span>Ask Socratic Tutor About This Step</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
