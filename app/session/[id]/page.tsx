"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { LogoSymbol } from "@/components/brand/Logo";
import { VisualRenderer } from "@/components/visuals/VisualRenderer";

interface Message {
  id: string;
  role: "learner" | "tutor";
  text: string;
  rung?: number;
  visualSpec?: Record<string, any> | null;
  timestamp: string;
}

function SessionWorkspaceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = (params?.id as string) || "session-default";
  const router = useRouter();

  // State
  const initialTopic = searchParams?.get("topic") || "General";
  const [topic, setTopic] = useState(initialTopic);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentRung, setCurrentRung] = useState(1);
  const [frustration, setFrustration] = useState(0.1);
  const [learnerState, setLearnerState] = useState("Learning");
  const [useSignals, setUseSignals] = useState(true);

  // Behavioral signals telemetry tracking
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [typingSeconds, setTypingSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteDetected, setPasteDetected] = useState(false);
  const [pastedLength, setPastedLength] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load real session data from backend on mount
  useEffect(() => {
    let active = true;
    setIsSessionLoading(true);

    fetch(`/api/session/${sessionId}?topic=${encodeURIComponent(initialTopic)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load session");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.topic) setTopic(data.topic);
        if (data.currentRung) setCurrentRung(data.currentRung);
        if (data.frustration !== undefined) setFrustration(data.frustration);
        if (data.turns && data.turns.length > 0) {
          setMessages(
            data.turns.map((t: any) => ({
              id: t.id,
              role: t.role,
              text: t.text,
              rung: t.rung,
              visualSpec: t.visualSpec,
              timestamp: t.timestamp,
            }))
          );
        }
      })
      .catch((err) => {
        console.error("[Session] Error fetching session details:", err);
      })
      .finally(() => {
        if (active) setIsSessionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId, initialTopic]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Tab switch listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Idle time tracker
  useEffect(() => {
    const resetIdle = () => setIdleSeconds(0);
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);

    idleTimerRef.current = setInterval(() => {
      setIdleSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

  // Keystroke handler for typing duration
  const handleKeyDown = () => {
    if (!typingStartTime) {
      const now = Date.now();
      setTypingStartTime(now);
      setTypingSeconds(1);
    } else {
      setTypingSeconds(Math.max(1, Math.round((Date.now() - typingStartTime) / 1000)));
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.length > 20) {
      setPasteDetected(true);
      setPastedLength(pasted.length);
    }
  };

  // Ladder rungs definition for Aside
  const ladderNames = [
    "Probe",
    "Narrow question",
    "Analogy",
    "Visual with blanks",
    "Worked example",
    "Partial reveal",
    "Full explanation",
  ];

  const handleSend = async (messageToSend?: string, isStuckRequest = false) => {
    const text = messageToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const durationSec = typingStartTime
      ? Math.max(1, Math.round((Date.now() - typingStartTime) / 1000))
      : typingSeconds;

    setTypingSeconds(durationSec);

    const clientSignals = useSignals
      ? {
          typing_duration_seconds: durationSec,
          tab_switches: tabSwitches,
          paste_event: pasteDetected,
          pasted_length: pastedLength,
          idle_seconds: idleSeconds,
          instant_hint_request: isStuckRequest,
        }
      : {};

    const newLearnerMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "learner",
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newLearnerMsg]);
    setInputMessage("");
    setTypingStartTime(null);
    setPasteDetected(false);
    setPastedLength(0);
    setIsLoading(true);

    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          learnerId: "default-learner",
          message: text,
          topic,
          signals: clientSignals,
        }),
      });

      if (!res.ok) throw new Error("Failed to process turn");
      const data = await res.json();

      const newTutorMsg: Message = {
        id: `tutor-${Date.now()}`,
        role: "tutor",
        text: data.text,
        rung: data.rung,
        visualSpec: data.visualSpec,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newTutorMsg]);
      setCurrentRung(data.rung || 4);
      setFrustration(data.frustration ?? 0.3);
      setLearnerState(
        data.state === "STUCK"
          ? "Stuck"
          : data.state === "MASTERY"
          ? "Mastery"
          : "Learning"
      );
    } catch (err: any) {
      console.error("[Session] Error processing turn:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-err-${Date.now()}`,
          role: "tutor",
          text: `Let's step back and reflect on ${topic}. What is your intuition on what should happen next?`,
          rung: currentRung,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--paper)" }}>
      {/* Workspace Header */}
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 24px",
          padding: "0 32px",
          minHeight: "64px",
          background: "var(--cotton)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 36px" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--ink)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "18px",
            }}
          >
            <LogoSymbol size={28} />
            Socratic Tutor
          </Link>
          <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap" }}>
            <Link
              href={`/session/${sessionId}`}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                boxSizing: "border-box",
                color: "var(--ink)",
                fontWeight: 600,
                borderBottom: "3px solid var(--coral-deep)",
              }}
            >
              Today
            </Link>
            <Link
              href="/sketch"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                boxSizing: "border-box",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Sketchboard
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                boxSizing: "border-box",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Progress
            </Link>
            <Link
              href="/dashboard#sessions"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                boxSizing: "border-box",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Sessions
            </Link>
          </nav>
        </div>
        <span
          style={{
            padding: "4px 10px",
            border: "1px solid var(--rule-2)",
            borderRadius: "6px",
            fontSize: "13px",
            color: "var(--muted)",
          }}
        >
          Session active
        </span>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "32px 32px 64px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "12px 16px" }}>
          <div>
            <h1 style={{ fontSize: "28px", lineHeight: 1.2 }}>{topic}</h1>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "16px" }}>
              The tutor asks, you answer. It only shows you the answer when you have tried.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => {
                const newTopic = prompt("Enter topic (e.g. recursion, binary_search, tree_traversal):", topic);
                if (newTopic) setTopic(newTopic);
              }}
            >
              Change topic
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
          {/* Conversation Column */}
          <section
            aria-label="Conversation"
            className="card"
            style={{
              flex: "2 1 600px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                {msg.role === "learner" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <p
                      style={{
                        margin: 0,
                        maxWidth: "460px",
                        padding: "12px 16px",
                        background: "#F8CFC3",
                        borderRadius: "12px 12px 4px 12px",
                        fontSize: "16px",
                      }}
                    >
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 28 28"
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    >
                      <circle cx="14" cy="14" r="12" fill="none" stroke="#B93E29" strokeWidth="2.5" />
                      <circle cx="14" cy="14" r="4" fill="#E8725A" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, maxWidth: "560px", fontSize: "16px" }}>{msg.text}</p>

                      {/* Dynamic Visual Scaffold Component */}
                      {msg.visualSpec && (
                        <VisualRenderer
                          visualSpec={msg.visualSpec}
                          onPredictionSubmit={(p) => setInputMessage(p)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            <div ref={messagesEndRef} />

            {/* Composer */}
            <form
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingTop: "20px",
                borderTop: "1px solid var(--rule)",
              }}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <label htmlFor="reply" style={{ color: "var(--muted)", fontSize: "13px" }}>
                Your answer
              </label>
              <textarea
                id="reply"
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Type your explanation or question..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid var(--muted)",
                  borderRadius: "6px",
                  background: "var(--cotton)",
                  color: "var(--ink)",
                  font: "400 16px var(--font-body)",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifySelf: "space-between", justifyContent: "space-between", gap: "12px" }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Stuck is fine. The button below gives you a smaller step, not the answer.
                </p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleSend("I'm feeling stuck on this step. Could you explain this visually with a sketchboard or diagram?", true)}
                  >
                    I&apos;m stuck
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isLoading}>
                    {isLoading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Aside Panel: How the tutor is helping */}
          <aside
            aria-label="How the tutor is helping"
            className="card"
            style={{
              flex: "1 1 320px",
              maxWidth: "100%",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px" }}>How the tutor is helping</h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                So you can see why each question is asked.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 500, marginBottom: "10px" }}>Help ladder</div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {ladderNames.map((name, i) => {
                  const n = i + 1;
                  const isCurrent = n === currentRung;
                  const isPast = n < currentRung;

                  const bg = isCurrent ? "#FFFDFB" : isPast ? "#B93E29" : "transparent";
                  const numColor = isCurrent ? "#B93E29" : isPast ? "#FFFFFF" : "#6B5F59";
                  const border = isCurrent
                    ? "2px solid #B93E29"
                    : isPast
                    ? "0"
                    : "1.5px solid #D6CCC3";

                  return (
                    <li
                      key={n}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: isCurrent ? "#2B2320" : "#6B5F59",
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      <span
                        className="fig"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "26px",
                          height: "26px",
                          borderRadius: "13px",
                          boxSizing: "border-box",
                          fontSize: "12px",
                          flexShrink: 0,
                          background: bg,
                          color: numColor,
                          border: border,
                        }}
                      >
                        {n}
                      </span>
                      <span>{name}</span>
                      {isCurrent && (
                        <span style={{ marginLeft: "auto", fontSize: "13px", color: "var(--coral-deep)", fontWeight: 600 }}>
                          You are here
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                <span style={{ fontWeight: 500 }}>How you are doing</span>
                <span style={{ fontWeight: 600, color: "var(--coral-deep)" }}>{learnerState}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>
                <span>Frustration estimate</span>
                <span className="fig" style={{ color: "var(--ink)" }}>{frustration.toFixed(1)}</span>
              </div>
              <div
                role="img"
                aria-label={`Frustration estimate ${frustration} out of 1`}
                style={{ height: "10px", background: "var(--paper-2)", borderRadius: "5px" }}
              >
                <div
                  style={{
                    width: `${Math.round(frustration * 100)}%`,
                    height: "10px",
                    background: "#E8725A",
                    borderRadius: "5px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>
                <span>Calm</span>
                <span>Frustrated</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "20px" }}>
              <div style={{ fontWeight: 500, marginBottom: "10px" }}>What the tutor noticed</div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "6px", color: "var(--muted)" }}>
                <li>You typed for {typingSeconds} seconds before sending.</li>
                <li>{tabSwitches === 0 ? "No tab switches in this session." : `${tabSwitches} tab switch(es) detected.`}</li>
                <li>{pasteDetected ? `Paste detected (${pastedLength} characters).` : "No large pastes."}</li>
                {idleSeconds > 20 && <li>Extended idle time ({idleSeconds}s).</li>}
              </ul>
              <p style={{ margin: "12px 0 14px", color: "var(--muted)", fontSize: "13px" }}>
                Only you can see this. It helps the tutor pick a gentler or harder question, and it never counts against you.
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "44px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useSignals}
                  onChange={(e) => setUseSignals(e.target.checked)}
                  style={{ width: "20px", height: "20px", accentColor: "#B93E29", margin: 0 }}
                />
                <span>Let the tutor use these signals</span>
              </label>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function SessionWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
          <p style={{ color: "var(--muted)", font: "500 16px var(--font-body)" }}>
            Loading your learning session...
          </p>
        </div>
      }
    >
      <SessionWorkspaceContent />
    </Suspense>
  );
}

