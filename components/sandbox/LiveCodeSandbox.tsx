"use client";

import React, { useState } from "react";
import type { PythonTraceStep } from "@/skills/trace/pythonSandbox";

interface LiveCodeSandboxProps {
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

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid var(--rule)",
        background: "#1E1E24",
        color: "#E2E8F0",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Sandbox Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "#141418",
          borderBottom: "1px solid #2D2D38",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "0.5px" }}>
            LIVE PYTHON TRACE SANDBOX
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#2D3748",
              color: "#94A3B8",
              fontFamily: "monospace",
            }}
          >
            Python 3.14 Isolated
          </span>
        </div>

        {/* Template selector & Run Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#2A2A36",
              color: "#E2E8F0",
              border: "1px solid #3F3F50",
              fontSize: "12px",
              cursor: "pointer",
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
              padding: "6px 14px",
              borderRadius: "6px",
              background: isRunning ? "#4B5563" : "#10B981",
              border: "none",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              cursor: isRunning ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            <span>{isRunning ? "Running..." : "▶ Run & Trace"}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Editor + Stepper Side-by-Side) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          minHeight: "280px",
        }}
      >
        {/* Left: Code Editor with Line Highlight */}
        <div
          style={{
            borderRight: "1px solid #2D2D38",
            display: "flex",
            flexDirection: "column",
            background: "#1E1E24",
          }}
        >
          {/* Stepper active line display */}
          {steps.length > 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "13px",
                lineHeight: "22px",
                overflowX: "auto",
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
                      background: isCurrent ? "rgba(245, 158, 11, 0.25)" : "transparent",
                      borderLeft: isCurrent ? "3px solid #F59E0B" : "3px solid transparent",
                      paddingLeft: "6px",
                      borderRadius: "2px",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        textAlign: "right",
                        marginRight: "12px",
                        color: isCurrent ? "#FBBF24" : "#64748B",
                        userSelect: "none",
                      }}
                    >
                      {lineNum}
                    </span>
                    <span
                      style={{
                        whiteSpace: "pre",
                        color: isCurrent ? "#FDE68A" : "#E2E8F0",
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
                minHeight: "220px",
                padding: "12px 14px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "13px",
                lineHeight: "20px",
                background: "transparent",
                color: "#F1F5F9",
                border: "none",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}

          {steps.length > 0 && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid #2D2D38" }}>
              <button
                type="button"
                onClick={() => setSteps([])}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ✏️ Edit Code
              </button>
            </div>
          )}
        </div>

        {/* Right: Step Navigator & Variable State Inspector */}
        <div
          style={{
            background: "#18181D",
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
                padding: "10px",
                borderRadius: "8px",
                background: "#23232C",
                border: "1px solid #333342",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
                  disabled={currentStepIdx === 0}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: currentStepIdx === 0 ? "#2D3748" : "#3B82F6",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: currentStepIdx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ⏮ Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
                  disabled={currentStepIdx === steps.length - 1}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: currentStepIdx === steps.length - 1 ? "#2D3748" : "#3B82F6",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: currentStepIdx === steps.length - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Next ⏭
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx(0)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: "#333342",
                    border: "none",
                    color: "#94A3B8",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>

              <div style={{ fontSize: "11px", color: "#FBBF24", fontWeight: 600 }}>
                Step {currentStepIdx + 1} of {steps.length} (Line {currentStep?.line})
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                borderRadius: "8px",
                background: "#23232C",
                border: "1px dashed #3D3D4E",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: "12px",
              }}
            >
              Click <strong>"▶ Run & Trace"</strong> to step through execution lines and inspect local variables.
            </div>
          )}

          {/* Active Local Variables Table */}
          {currentStep && (
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid #2D2D38",
                background: "#202028",
                padding: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                  fontSize: "11px",
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                <span>Memory State (Locals)</span>
                <span>Frame: {currentStep.function}()</span>
              </div>

              {Object.keys(currentStep.locals).length === 0 ? (
                <div style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic" }}>
                  No local variables initialized yet in this scope.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "6px",
                  }}
                >
                  {Object.entries(currentStep.locals).map(([name, val]) => (
                    <div
                      key={name}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "4px",
                        background: "#16161B",
                        border: "1px solid #333342",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "11px",
                      }}
                    >
                      <span style={{ color: "#38BDF8", fontWeight: 600 }}>{name}: </span>
                      <span style={{ color: "#A7F3D0" }}>{val}</span>
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
                padding: "10px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #EF4444",
                color: "#FCA5A5",
                fontSize: "11px",
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
                border: "1px solid #2D2D38",
                background: "#111115",
                padding: "10px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#64748B", marginBottom: "4px" }}>Output:</div>
              <pre style={{ margin: 0, color: "#34D399", whiteSpace: "pre-wrap" }}>{stdout}</pre>
            </div>
          )}

          {/* Ask Socratic Tutor Bridge Button */}
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
                padding: "10px 14px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                border: "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              }}
            >
              <span>💡 Ask Socratic Tutor About This Step</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
