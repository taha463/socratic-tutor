"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogoSymbol } from "@/components/brand/Logo";
import { SketchNotebook } from "@/components/visuals/SketchNotebook";

const PRESET_TOPICS = [
  { label: "Self-Attention in Transformers", query: "Self-Attention in Transformers" },
  { label: "Recursion & Call Stack", query: "Recursion base case and call stack in Python" },
  { label: "7B Model on CPU Memory Math", query: "Running 7B parameter LLM on CPU without GPU" },
  { label: "Backpropagation", query: "Backpropagation and chain rule gradient flow" },
  { label: "Binary Search Invariant", query: "Binary search boundary conditions and mid calculation" },
];

export default function SketchSocraticPage() {
  const [selectedTopic, setSelectedTopic] = useState("Self-Attention in Transformers");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
            SketchSocratic
          </Link>
          <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap" }}>
            <Link
              href="/session/new"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Dialogue Session
            </Link>
            <Link
              href="/sketch"
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "64px",
                padding: "0 14px",
                color: "var(--ink)",
                fontWeight: 600,
                borderBottom: "3px solid var(--coral-deep)",
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
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Progress
            </Link>
          </nav>
        </div>
        <span
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27C93F" }} />
          Groq openai/gpt-oss-120b Strict Schema Active
        </span>
      </header>

      {/* Main Workspace */}
      <main
        style={{
          maxWidth: "1180px",
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px 64px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Intro Banner */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
          <div>
            <h1 className="font-sketch" style={{ fontSize: "32px", fontWeight: 700, margin: "0 0 6px", color: "#2C2C2C" }}>
              Visual Hand-Drawn Socratic Whiteboard
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "15px", maxWidth: "680px" }}>
              Instead of paragraphs of text, the AI tutor draws a notebook diagram mapping the inputs to outputs.
              The critical conclusion is left as a <strong>Socratic Mystery Box ([ ? ])</strong> for you to deduce.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PRESET_TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setSelectedTopic(t.query)}
                className="btn btn-sm font-sketch"
                style={{
                  background: selectedTopic === t.query ? "#FFF2CC" : "#FFFDFB",
                  borderColor: selectedTopic === t.query ? "#D4A017" : "#E6E2D8",
                  color: selectedTopic === t.query ? "#854D0E" : "#2C2C2C",
                  fontWeight: selectedTopic === t.query ? 700 : 500,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Sketch Notebook Component */}
        <SketchNotebook conceptQuery={selectedTopic} />
      </main>
    </div>
  );
}

