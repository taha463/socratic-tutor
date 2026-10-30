"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogoSymbol } from "@/components/brand/Logo";

export default function LandingPage() {
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);

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
      {/* Header */}
      <header
        style={{
          maxWidth: "1200px",
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
        <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
          <a className="navlink" href="#how">How it works</a>
          <a className="navlink" href="#visuals">Visuals</a>
          <Link className="navlink" href="/dashboard">Dashboard</Link>
          <a className="navlink" href="#privacy">Privacy</a>
          <Link
            className="btn btn-primary"
            href="/session/new"
            style={{ marginLeft: "12px", minHeight: "44px" }}
          >
            Start learning
          </Link>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "56px 32px 96px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "48px",
          }}
        >
          <div style={{ flex: "1 1 460px", minWidth: 0 }}>
            <h1 style={{ fontSize: "64px", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
              Learn it by working it out
            </h1>
            <p style={{ margin: "24px 0 0", maxWidth: "460px", fontSize: "20px", color: "var(--muted)" }}>
              A tutor that asks, shows, and never just hands you the answer.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "32px" }}>
              <Link className="btn btn-primary" href="/session/new">
                Start a session
              </Link>
              <a className="btn" href="#how">
                See how it works
              </a>
            </div>
          </div>

          <div
            style={{
              flex: "1 1 480px",
              minWidth: 0,
              padding: "32px",
              background: "var(--paper-2)",
              borderRadius: "20px",
              boxSizing: "border-box",
            }}
          >
            <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifySelf: "flex-end", justifyContent: "flex-end" }}>
                <p
                  style={{
                    margin: 0,
                    maxWidth: "340px",
                    padding: "10px 14px",
                    background: "#F8CFC3",
                    borderRadius: "12px 12px 4px 12px",
                  }}
                >
                  I don&apos;t get how fact(3) ends up as 6.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: "2px" }}
                >
                  <circle cx="14" cy="14" r="12" fill="none" stroke="#B93E29" strokeWidth="2.5" />
                  <circle cx="14" cy="14" r="4" fill="#E8725A" />
                </svg>
                <p style={{ margin: 0 }}>Let&apos;s watch it unfold. What does fact(1) hand back?</p>
              </div>
              <div style={{ padding: "16px", border: "1px solid var(--rule)", borderRadius: "10px", background: "var(--paper)" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "76px 1fr auto",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      background: "var(--cotton)",
                      border: "1px solid var(--rule-2)",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span className="fig" style={{ fontWeight: 500 }}>fact(3)</span>
                    <span style={{ color: "var(--muted)" }}>waits for fact(2)</span>
                    <span className="fig" style={{ color: "var(--muted)" }}>n = 3</span>
                  </div>
                  <svg width="20" height="14" viewBox="0 0 20 16" aria-hidden="true" style={{ marginLeft: "20px" }}>
                    <path d="M10 1 V12 M5 8 L10 13 L15 8" fill="none" stroke="#6B5F59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "76px 1fr auto",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      marginLeft: "20px",
                      background: "var(--cotton)",
                      border: "1px solid var(--rule-2)",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span className="fig" style={{ fontWeight: 500 }}>fact(2)</span>
                    <span style={{ color: "var(--muted)" }}>waits for fact(1)</span>
                    <span className="fig" style={{ color: "var(--muted)" }}>n = 2</span>
                  </div>
                  <svg width="20" height="14" viewBox="0 0 20 16" aria-hidden="true" style={{ marginLeft: "40px" }}>
                    <path d="M10 1 V12 M5 8 L10 13 L15 8" fill="none" stroke="#6B5F59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "76px 1fr auto",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      marginLeft: "40px",
                      background: "var(--cotton)",
                      border: "2px solid var(--coral)",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span className="fig" style={{ fontWeight: 500 }}>fact(1)</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
                      returns{" "}
                      <span
                        className="fig"
                        aria-label="Hidden answer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "48px",
                          height: "28px",
                          border: "2px dashed var(--coral-deep)",
                          borderRadius: "6px",
                          color: "var(--coral-deep)",
                          fontWeight: 500,
                          boxSizing: "border-box",
                        }}
                      >
                        {revealed ? "1" : "?"}
                      </span>
                    </span>
                    <span className="fig" style={{ color: "var(--muted)" }}>n = 1</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "16px" }}>
                  <input
                    type="text"
                    placeholder="Predict"
                    value={prediction}
                    onChange={(e) => setPrediction(e.target.value)}
                    className="fig"
                    style={{
                      width: "80px",
                      minHeight: "36px",
                      padding: "0 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--rule-2)",
                      background: "var(--cotton)",
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setRevealed(true)}
                  >
                    Check
                  </button>
                  {revealed && (
                    <span style={{ fontSize: "13px", color: "var(--coral-deep)", fontWeight: 500 }}>
                      Correct! fact(1) returns 1.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works: the help ladder */}
        <section
          id="how"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "56px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <h2 style={{ fontSize: "40px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
              It asks first, then shows
            </h2>
            <p style={{ margin: "20px 0 0", maxWidth: "420px", fontSize: "18px", color: "var(--muted)" }}>
              Stay stuck and it climbs seven steps of help, one at a time. You are never left guessing.
            </p>
          </div>
          <div className="card" style={{ flex: "1 1 480px", padding: "12px 24px" }}>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {ladderSteps.map((step, idx) => (
                <li
                  key={step.n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "14px 0",
                    borderBottom: idx === ladderSteps.length - 1 ? 0 : "1px solid #E5DED7",
                  }}
                >
                  <span
                    className="fig"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "16px",
                      flexShrink: 0,
                      fontSize: "14px",
                      background: step.bg,
                      color: step.numColor,
                      fontWeight: 600,
                    }}
                  >
                    {step.n}
                  </span>
                  <span style={{ fontWeight: 600, minWidth: "150px" }}>{step.name}</span>
                  <span style={{ color: "var(--muted)" }}>{step.line}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Visuals */}
        <section
          id="visuals"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <h2 style={{ fontSize: "40px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            Every idea gets a picture
          </h2>
          <p style={{ margin: "20px 0 0", maxWidth: "560px", fontSize: "18px", color: "var(--muted)" }}>
            Each picture leaves a gap for you to fill, so you still do the thinking.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              marginTop: "48px",
            }}
          >
            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Three connected boxes, the middle one left blank"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <rect x="16" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <rect x="94" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#B93E29" strokeWidth="2" strokeDasharray="5 4" />
                <rect x="172" y="44" width="52" height="32" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <path d="M68 60 H94 M146 60 H172" stroke="#6B5F59" strokeWidth="1.5" />
                <text x="120" y="65" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="14" fill="#B93E29">?</text>
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Diagrams with blanks</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Flows and structures with a missing piece.</p>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Lines of code with one highlighted and a variable box beside them"
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
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Code you can step through</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Predict the next line, then watch it run.</p>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="A loss curve falling toward a minimum"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <path d="M30 14 V100 H222" fill="none" stroke="#D6CCC3" strokeWidth="1.5" />
                <path d="M32 22 C60 70 90 92 130 96 S190 99 214 99" fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="32" cy="22" r="4" fill="#E8725A" />
                <circle cx="58" cy="58" r="4" fill="#E8725A" />
                <circle cx="90" cy="82" r="4" fill="#E8725A" />
                <circle cx="130" cy="95" r="4" fill="#E8725A" />
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Plots of the maths</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>See a curve move as the numbers change.</p>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="Four animation frames and a playback bar"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <rect x="14" y="20" width="48" height="48" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <circle cx="26" cy="32" r="7" fill="#E8725A" />
                <rect x="66" y="20" width="48" height="48" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <circle cx="90" cy="38" r="7" fill="#E8725A" />
                <rect x="118" y="20" width="48" height="48" rx="6" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <circle cx="142" cy="50" r="7" fill="#E8725A" />
                <rect x="170" y="20" width="48" height="48" rx="6" fill="#FFFDFB" stroke="#B93E29" strokeWidth="2" />
                <circle cx="194" cy="56" r="7" fill="#B93E29" />
                <path d="M14 98 H226" stroke="#D6CCC3" strokeWidth="3" strokeLinecap="round" />
                <path d="M14 98 H150" stroke="#B93E29" strokeWidth="3" strokeLinecap="round" />
                <circle cx="150" cy="98" r="6" fill="#B93E29" />
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Step-by-step animations</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Play, pause and scrub through a process.</p>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="An isometric cube"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <polygon points="120,18 158,40 120,62 82,40" fill="#F8CFC3" />
                <polygon points="82,40 120,62 120,104 82,82" fill="#E8725A" />
                <polygon points="158,40 120,62 120,104 158,82" fill="#B93E29" />
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Shapes you can turn</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Spatial ideas shown in three dimensions.</p>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <svg
                viewBox="0 0 240 120"
                role="img"
                aria-label="A circle labelled stack linked to a square labelled plates"
                style={{ width: "100%", height: "auto", display: "block", background: "var(--paper)", borderRadius: "8px" }}
              >
                <circle cx="62" cy="60" r="32" fill="#F8CFC3" />
                <rect x="146" y="28" width="64" height="64" rx="8" fill="#FFFDFB" stroke="#B93E29" strokeWidth="2" />
                <path d="M94 60 H146" stroke="#6B5F59" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="62" y="65" textAnchor="middle" fontFamily="Onest, sans-serif" fontSize="14" fill="#2B2320">stack</text>
                <text x="178" y="65" textAnchor="middle" fontFamily="Onest, sans-serif" fontSize="14" fill="#2B2320">plates</text>
              </svg>
              <h3 style={{ fontSize: "18px", marginTop: "16px" }}>Everyday comparisons</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>A new idea tied to one you already know.</p>
            </div>
          </div>
        </section>

        {/* Progress Preview */}
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "56px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div className="card" style={{ flex: "1 1 440px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <span style={{ alignSelf: "flex-end", padding: "4px 10px", border: "1px solid var(--rule-2)", borderRadius: "6px", fontSize: "13px", color: "var(--muted)" }}>
              Sample data
            </span>
            <svg viewBox="0 0 500 500" role="img" aria-label="Wagon wheel of mastery by concept" style={{ width: "100%", maxWidth: "440px", height: "auto", display: "block" }}>
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
              <line x1="250.0" y1="226.0" x2="250.0" y2="122.7" stroke="#B93E29" strokeWidth="12" strokeLinecap="round" />
              <line x1="264.1" y1="230.6" x2="314.5" y2="161.3" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="272.8" y1="242.6" x2="361.5" y2="213.8" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="272.8" y1="257.4" x2="322.0" y2="273.4" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="272.8" y1="257.4" x2="322.0" y2="273.4" stroke="#FFFDFB" strokeWidth="7" strokeLinecap="round" />
              <line x1="264.1" y1="269.4" x2="306.3" y2="327.5" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="250.0" y1="274.0" x2="250.0" y2="384.9" stroke="#B93E29" strokeWidth="12" strokeLinecap="round" />
              <line x1="235.9" y1="269.4" x2="168.5" y2="362.2" stroke="#B93E29" strokeWidth="12" strokeLinecap="round" />
              <line x1="227.2" y1="257.4" x2="151.7" y2="281.9" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="227.2" y1="242.6" x2="134.9" y2="212.6" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="235.9" y1="230.6" x2="210.0" y2="194.9" stroke="#E8725A" strokeWidth="12" strokeLinecap="round" />
              <line x1="235.9" y1="230.6" x2="210.0" y2="194.9" stroke="#FFFDFB" strokeWidth="7" strokeLinecap="round" />
              <circle cx="250" cy="250" r="22" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
              <text x="250" y="256" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="16" fontWeight="500" fill="#2B2320">68</text>
              <g fontFamily="Onest, sans-serif" fontSize="13" fill="#2B2320">
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
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>
            <h2 style={{ fontSize: "40px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
              See what you actually learned
            </h2>
            <p style={{ margin: "20px 0 0", maxWidth: "440px", fontSize: "18px", color: "var(--muted)" }}>
              Every concept gets a spoke. Needing fewer hints over the weeks is the sign it is working.
            </p>
            <p style={{ margin: "16px 0 0", maxWidth: "440px", fontSize: "18px", color: "var(--muted)" }}>
              Streaks, monthly mastery, and weak spots sit on one unified dashboard.
            </p>
            <div style={{ marginTop: "28px" }}>
              <Link className="btn btn-primary" href="/dashboard">
                Open mastery dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section
          id="privacy"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <h2 style={{ fontSize: "40px", lineHeight: 1.1, letterSpacing: "-0.025em", maxWidth: "640px" }}>
            It adapts to you. It never polices you.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 0,
              marginTop: "48px",
            }}
          >
            <div style={{ padding: "0 32px 0 0" }}>
              <h3 style={{ fontSize: "18px" }}>You paste a long answer</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>It asks you to say it in your own words.</p>
            </div>
            <div style={{ padding: "0 32px", borderLeft: "1px solid var(--rule-2)" }}>
              <h3 style={{ fontSize: "18px" }}>You switch tabs</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>It may ask why the answer works.</p>
            </div>
            <div style={{ padding: "0 0 0 32px", borderLeft: "1px solid var(--rule-2)" }}>
              <h3 style={{ fontSize: "18px" }}>Your typing slows down</h3>
              <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>It offers a smaller step.</p>
            </div>
          </div>
          <p style={{ margin: "40px 0 0", maxWidth: "560px", fontSize: "18px", color: "var(--muted)" }}>
            You can see every signal it notices in the side panel, and one toggle switch turns them all off.
          </p>
        </section>

        {/* Install */}
        <section
          id="install"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "96px 32px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "56px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>
            <h2 style={{ fontSize: "40px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
              Four commands, then it runs
            </h2>
            <p style={{ margin: "20px 0 0", maxWidth: "440px", fontSize: "18px", color: "var(--muted)" }}>
              Add one key for Anthropic, OpenAI or Gemini, or pick Ollama to run free on your own machine.
            </p>
            <div style={{ marginTop: "32px" }}>
              <Link className="btn btn-primary" href="/session/new">
                Start now
              </Link>
            </div>
          </div>
          <div className="card" style={{ flex: "1 1 480px", padding: "28px" }}>
            <pre className="fig" style={{ margin: 0, fontSize: "16px", lineHeight: 2, color: "var(--ink)", overflowX: "auto" }}>
              <span style={{ color: "var(--muted)" }}>$</span> git clone https://github.com/your-username/socratic-tutor{"\n"}
              <span style={{ color: "var(--muted)" }}>$</span> cp .env.example .env{"\n"}
              <span style={{ color: "var(--muted)" }}>$</span> npm install{"\n"}
              <span style={{ color: "var(--muted)" }}>$</span> npm run dev
            </pre>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "40px 32px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "18px" }}>
            <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#B93E29" strokeWidth="2.5" />
              <circle cx="14" cy="14" r="4" fill="#E8725A" />
            </svg>
            Socratic Tutor
          </div>
          <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            <a className="navlink" href="#how">How it works</a>
            <a className="navlink" href="#visuals">Visuals</a>
            <Link className="navlink" href="/dashboard">Dashboard</Link>
            <a className="navlink" href="#privacy">Privacy</a>
            <a className="navlink" href="#install">Install</a>
          </nav>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
            Free and local-first under the MIT licence.
          </p>
        </div>
      </footer>
    </div>
  );
}
