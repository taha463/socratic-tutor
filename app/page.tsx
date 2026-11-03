"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogoSymbol } from "@/components/brand/Logo";

/* Hallmark · v2.0.0 · genre: modern-minimal · theme: Coral · posture: Stage · job: start learning */

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

export default function LandingPage() {
  useScrollReveal();

  // Interactive Socratic Mystery Box demo state in the hero
  const [isMysterySolved, setIsMysterySolved] = useState(false);

  const ladderSteps = [
    { n: 1, name: "Probe", line: "Asks what you already think.", bg: "#B93E29", numColor: "#FFFFFF" },
    { n: 2, name: "Narrow question", line: "Makes the question smaller.", bg: "#B93E29", numColor: "#FFFFFF" },
    { n: 3, name: "Analogy", line: "Compares it to something familiar.", bg: "#E8725A", numColor: "#2B2320" },
    { n: 4, name: "Visual with blanks", line: "Draws it, with a gap for you.", bg: "#E8725A", numColor: "#2B2320" },
    { n: 5, name: "Worked example", line: "Solves a similar problem in full.", bg: "#F8CFC3", numColor: "#2B2320" },
    { n: 6, name: "Partial reveal", line: "Shows the key step, you finish.", bg: "#F8CFC3", numColor: "#2B2320" },
    { n: 7, name: "Full explanation", line: "Explains it, then checks you got it.", bg: "#F8CFC3", numColor: "#2B2320" },
  ];

  return (
    <div style={{ minHeight: "100%", background: "var(--paper)" }}>
      {/* Navigation */}
      <header
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 32px",
          boxSizing: "border-box",
          minHeight: "80px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 24px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "var(--ink)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "20px",
          }}
        >
          <LogoSymbol size={28} />
          Socratic Tutor
        </Link>
        <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          <a className="navlink" href="#how">How it works</a>
          <a className="navlink" href="#visuals">Visuals</a>
          <Link className="navlink" href="/dashboard">Dashboard</Link>
          <a className="navlink" href="#privacy">Privacy</a>
          <Link
            className="btn btn-primary"
            href="/session/new"
            style={{ marginLeft: "12px" }}
          >
            Start learning
          </Link>
        </nav>
      </header>

      <main id="top">
        {/* Hero Section — Hallmark Stage Posture */}
        <section
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "64px 32px 104px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "48px",
          }}
        >
          {/* Left Columns (1 to 5): Headline, Sentence, Actions */}
          <div style={{ flex: "1 1 480px", minWidth: 0 }}>
            <h1
              style={{
                fontSize: "clamp(2.75rem, 5.5vw, 4.25rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                margin: "0 0 24px",
                color: "var(--ink)",
              }}
            >
              Never memorise.<br />
              <span style={{ color: "var(--coral-deep)" }}>Work it out.</span>
            </h1>

            <p
              style={{
                margin: "0 0 36px",
                maxWidth: "460px",
                fontSize: "20px",
                lineHeight: 1.5,
                color: "var(--muted)",
              }}
            >
              A visual Socratic workspace that draws the mental model and leaves the critical leap for you to complete.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              <Link className="btn btn-primary" href="/session/new">
                Start learning
              </Link>
              <a className="btn" href="#how">
                How it works
              </a>
            </div>
          </div>

          {/* Right Columns (6 to 12): Live Socratic Hand-Drawn Whiteboard Stage */}
          <div
            style={{
              flex: "1 1 520px",
              minWidth: 0,
              maxWidth: "620px",
            }}
          >
            <div
              className="card"
              style={{
                background: "#FDFBF7",
                border: "2px solid #E6E2D8",
                borderRadius: "14px",
                boxShadow: "0 8px 24px rgba(43, 35, 32, 0.08)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Window Header */}
              <div
                style={{
                  background: "#F2EDE4",
                  borderBottom: "1.5px solid #E6E2D8",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F56", display: "inline-block" }} />
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27C93F", display: "inline-block" }} />
                  <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 600, color: "#5C5652", fontFamily: "var(--font-figure)" }}>
                    Recursion · Call Stack Whiteboard
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "#FFF2CC",
                    color: "#B45309",
                    border: "1px solid #FCD34D",
                  }}
                >
                  80/20 Socratic Rule
                </span>
              </div>

              {/* Whiteboard Body with Hand-Drawn Flow */}
              <div
                className="sketch-canvas-grid"
                style={{
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Active Step
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>
                    What stops a recursive function from calling itself infinitely?
                  </div>
                </div>

                {/* Hand-Drawn Flow Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    background: "#FFFDFB",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1.5px solid #E6E2D8",
                  }}
                >
                  {/* Left Box (Known state) */}
                  <div
                    style={{
                      flex: "1 1 180px",
                      background: "#D0E4F7",
                      border: "1.5px solid #5B9BD5",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#1E3A8A", textTransform: "uppercase" }}>
                      Recursive Call
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#2C2C2C", marginTop: "4px" }}>
                      fact(n - 1)
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, marginBottom: "2px" }}>
                      evaluates
                    </span>
                    <svg width="48" height="18" viewBox="0 0 48 18" fill="none" aria-hidden="true">
                      <path d="M2 9 Q 20 4, 38 9" stroke="#2B2320" strokeWidth="2" strokeLinecap="round" />
                      <path d="M34 4 L 42 9 L 34 14" stroke="#2B2320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>

                  {/* Right Box — Socratic Mystery Box */}
                  <div style={{ flex: "1 1 180px" }}>
                    {isMysterySolved ? (
                      <div
                        style={{
                          background: "#D9EAD3",
                          border: "1.5px solid #6AA84F",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                      >
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#14532D", textTransform: "uppercase" }}>
                          ✓ Solved Target
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2C2C2C", marginTop: "4px" }}>
                          Base Case: n &le; 1
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsMysterySolved(true)}
                        className="sketch-box-pulse"
                        style={{
                          width: "100%",
                          background: "#FFF2CC",
                          border: "2px dashed #D4A017",
                          borderRadius: "8px",
                          padding: "10px",
                          color: "#854D0E",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span style={{ fontSize: "12px" }}>[ ? ] Mystery Box</span>
                        <span style={{ fontSize: "11px", fontWeight: 500, color: "#A16207" }}>Click to reveal guard</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Socratic Resolution Note */}
                <div style={{ fontSize: "13px", color: isMysterySolved ? "#166534" : "var(--muted)", lineHeight: 1.45 }}>
                  {isMysterySolved ? (
                    <span>
                      <strong>Invariant met:</strong> When input reaches 1, the base case returns directly without making further recursive calls, unwinding the call stack cleanly.
                    </span>
                  ) : (
                    <span>
                      The tutor draws 80% of the diagram, leaving the critical mental leap for the student to complete.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: How It Works — The 7-Rung Help Ladder */}
        <section
          id="how"
          className="scroll-reveal"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: "56px",
          }}
        >
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <h2 style={{ fontSize: "38px", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              It asks first, then shows
            </h2>
            <p style={{ margin: "18px 0 0", maxWidth: "420px", fontSize: "18px", color: "var(--muted)", lineHeight: 1.5 }}>
              Stay stuck and the tutor climbs seven steps of help, one at a time. You are never spoonfed answers, and never left behind.
            </p>
          </div>

          <div className="card" style={{ flex: "1 1 540px", padding: "16px 28px" }}>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {ladderSteps.map((step, idx) => (
                <li
                  key={step.n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    padding: "16px 0",
                    borderBottom: idx === ladderSteps.length - 1 ? 0 : "1px solid #E5DED7",
                  }}
                >
                  <span
                    className="fig"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "15px",
                      flexShrink: 0,
                      fontSize: "13px",
                      background: step.bg,
                      color: step.numColor,
                      fontWeight: 600,
                    }}
                  >
                    {step.n}
                  </span>
                  <span style={{ fontWeight: 600, minWidth: "160px", color: "var(--ink)", fontSize: "16px" }}>
                    {step.name}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "15px" }}>{step.line}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Section 3: Visual Modalities With Gaps */}
        <section
          id="visuals"
          className="scroll-reveal"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <h2 style={{ fontSize: "38px", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Every idea gets a picture
            </h2>
            <p style={{ margin: "16px 0 0", fontSize: "18px", color: "var(--muted)", lineHeight: 1.5 }}>
              Visual scaffolds embed directly into the dialogue whenever you request a diagram or reach a conceptual roadblock.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              marginTop: "48px",
            }}
          >
            {/* 1. Diagrams with Blanks */}
            <div className="card" style={{ padding: "24px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Three connected boxes with the center box left blank"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <rect x="16" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <rect x="94" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#B93E29" strokeWidth="2" strokeDasharray="5 4" />
                <rect x="172" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <path d="M68 60 H94 M146 60 H172" stroke="#6B5F59" strokeWidth="1.5" />
                <text x="120" y="65" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="14" fill="#B93E29">?</text>
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "18px", color: "var(--ink)" }}>Diagrams with blanks</h3>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "14px", lineHeight: 1.45 }}>
                Hand-drawn process flows and state graphs with an interactive target box to solve.
              </p>
            </div>

            {/* 2. Code Stepper */}
            <div className="card" style={{ padding: "24px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Code line stepping with variable values"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <rect x="14" y="46" width="150" height="16" rx="4" fill="#F8CFC3" />
                <rect x="24" y="22" width="90" height="8" rx="3" fill="#D6CCC3" />
                <rect x="24" y="50" width="120" height="8" rx="3" fill="#B93E29" />
                <rect x="36" y="70" width="70" height="8" rx="3" fill="#D6CCC3" />
                <rect x="36" y="86" width="100" height="8" rx="3" fill="#D6CCC3" />
                <rect x="176" y="24" width="50" height="72" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <text x="201" y="52" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="13" fill="#6B5F59">n</text>
                <text x="201" y="78" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="16" fontWeight="500" fill="#2B2320">2</text>
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "18px", color: "var(--ink)" }}>Execution stepping</h3>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "14px", lineHeight: 1.45 }}>
                Freeze runtime at critical mutations and predict what variables evaluate to before execution resumes.
              </p>
            </div>

            {/* 3. Complexity Curves */}
            <div className="card" style={{ padding: "24px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Algorithmic complexity Big-O curve"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <path d="M30 14 V100 H222" fill="none" stroke="#D6CCC3" strokeWidth="1.5" />
                <path d="M32 22 C60 70 90 92 130 96 S190 99 214 99" fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="32" cy="22" r="4" fill="#E8725A" />
                <circle cx="58" cy="58" r="4" fill="#E8725A" />
                <circle cx="90" cy="82" r="4" fill="#E8725A" />
                <circle cx="130" cy="95" r="4" fill="#E8725A" />
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "18px", color: "var(--ink)" }}>Mathematical plots</h3>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "14px", lineHeight: 1.45 }}>
                Inspect Big-O scaling and loss surfaces directly as the problem size scales.
              </p>
            </div>

            {/* 4. Mental Models & Analogies */}
            <div className="card" style={{ padding: "24px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Everyday analogy mapping"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <circle cx="62" cy="60" r="32" fill="#F8CFC3" />
                <rect x="146" y="28" width="64" height="64" rx="8" fill="#FFFDFB" stroke="#B93E29" strokeWidth="2" />
                <path d="M94 60 H146" stroke="#6B5F59" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="62" y="65" textAnchor="middle" fontFamily="Onest, sans-serif" fontSize="14" fill="#2B2320">stack</text>
                <text x="178" y="65" textAnchor="middle" fontFamily="Onest, sans-serif" fontSize="14" fill="#2B2320">plates</text>
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "18px", color: "var(--ink)" }}>Everyday analogies</h3>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "14px", lineHeight: 1.45 }}>
                Tie complex abstract abstractions back to physical mechanisms you already understand.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Mastery Dashboard Preview */}
        <section
          id="mastery"
          className="scroll-reveal"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "56px",
          }}
        >
          <div className="card" style={{ flex: "1 1 440px", padding: "28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg viewBox="0 0 500 500" role="img" aria-label="Wagon wheel of mastery by concept" style={{ width: "100%", maxWidth: "420px", height: "auto", display: "block" }}>
              <circle cx="250" cy="250" r="55.5" fill="none" stroke="#E5DED7" strokeWidth="1" />
              <circle cx="250" cy="250" r="87" fill="none" stroke="#E5DED7" strokeWidth="1" />
              <circle cx="250" cy="250" r="118.5" fill="none" stroke="#E5DED7" strokeWidth="1" />
              <circle cx="250" cy="250" r="150" fill="none" stroke="#D6CCC3" strokeWidth="1" />
              <polygon
                points="250.0,122.7 314.5,161.3 361.5,213.8 322.0,273.4 306.3,327.5 250.0,384.9 168.5,362.2 151.7,281.9 134.9,212.6 210.0,194.9"
                fill="#E8725A"
                fillOpacity="0.10"
                stroke="#E8725A"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <line x1="250.0" y1="226.0" x2="250.0" y2="122.7" stroke="#B93E29" strokeWidth="10" strokeLinecap="round" />
              <line x1="264.1" y1="230.6" x2="314.5" y2="161.3" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="272.8" y1="242.6" x2="361.5" y2="213.8" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="272.8" y1="257.4" x2="322.0" y2="273.4" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="264.1" y1="269.4" x2="306.3" y2="327.5" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="250.0" y1="274.0" x2="250.0" y2="384.9" stroke="#B93E29" strokeWidth="10" strokeLinecap="round" />
              <line x1="235.9" y1="269.4" x2="168.5" y2="362.2" stroke="#B93E29" strokeWidth="10" strokeLinecap="round" />
              <line x1="227.2" y1="257.4" x2="151.7" y2="281.9" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="227.2" y1="242.6" x2="134.9" y2="212.6" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <line x1="235.9" y1="230.6" x2="210.0" y2="194.9" stroke="#E8725A" strokeWidth="10" strokeLinecap="round" />
              <circle cx="250" cy="250" r="22" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
              <text x="250" y="256" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="16" fontWeight="500" fill="#2B2320">68</text>
              <g fontFamily="Onest, sans-serif" fontSize="12" fill="#2B2320">
                <text x="250.0" y="78.0" textAnchor="middle">Recursion</text>
                <text x="351.1" y="110.8" textAnchor="start">Binary trees</text>
                <text x="413.6" y="196.8" textAnchor="start">Big-O</text>
                <text x="413.6" y="303.2" textAnchor="start">Pointers</text>
                <text x="351.1" y="389.2" textAnchor="start">Gradient descent</text>
                <text x="250.0" y="422.0" textAnchor="middle">SQL joins</text>
                <text x="148.9" y="389.2" textAnchor="end">HTTP</text>
                <text x="86.4" y="303.2" textAnchor="end">Hash maps</text>
                <text x="86.4" y="196.8" textAnchor="end">Sorting</text>
                <text x="148.9" y="110.8" textAnchor="end">Graphs</text>
              </g>
            </svg>
          </div>

          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <h2 style={{ fontSize: "38px", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              See what you actually understand
            </h2>
            <p style={{ margin: "18px 0 0", maxWidth: "440px", fontSize: "18px", color: "var(--muted)", lineHeight: 1.5 }}>
              Every concept gets a spoke on the mastery wheel. Needing fewer ladder rungs over the weeks is the mathematical proof of genuine learning.
            </p>
            <div style={{ marginTop: "32px" }}>
              <Link className="btn btn-primary" href="/dashboard">
                Open mastery dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Section 5: Transparent Behavioral Signals */}
        <section
          id="privacy"
          className="scroll-reveal"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <h2 style={{ fontSize: "38px", lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: "640px", color: "var(--ink)" }}>
            It adapts to you. It never polices you.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "32px",
              marginTop: "48px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "18px", color: "var(--ink)" }}>You paste a long answer</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "15px", lineHeight: 1.5 }}>
                It gently asks you to put the invariant into your own words.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", color: "var(--ink)" }}>You switch tabs</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "15px", lineHeight: 1.5 }}>
                It prompts why the answer works rather than verifying memory.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", color: "var(--ink)" }}>Your typing pauses</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "15px", lineHeight: 1.5 }}>
                It automatically offers a smaller, more bite-sized step.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "48px 32px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "18px", color: "var(--ink)" }}>
            <LogoSymbol size={26} />
            Socratic Tutor
          </div>
          <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <a className="navlink" href="#how">How it works</a>
            <a className="navlink" href="#visuals">Visuals</a>
            <Link className="navlink" href="/dashboard">Dashboard</Link>
            <a className="navlink" href="#privacy">Privacy</a>
          </nav>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
            Local-first pedagogical AI under the MIT licence.
          </p>
        </div>
      </footer>
    </div>
  );
}
