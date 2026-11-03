"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SocraticTutor ErrorBoundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
        textAlign: "center",
      }}
    >
      <div
        className="fig"
        style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "var(--coral-deep)",
          marginBottom: "16px",
        }}
      >
        Notice
      </div>
      <h1 style={{ fontSize: "24px", margin: "0 0 12px" }}>Something interrupted this step</h1>
      <p style={{ maxWidth: "480px", color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.5 }}>
        A momentary render discrepancy occurred. You can retry this interaction or return to the main dashboard.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary"
        >
          Try again
        </button>
        <Link href="/" className="btn">
          Back to Sessions
        </Link>
      </div>
    </div>
  );
}

