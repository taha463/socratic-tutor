"use client";

import Link from "next/link";

export default function NotFound() {
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
          fontSize: "64px",
          fontWeight: 600,
          color: "var(--coral-deep)",
          marginBottom: "12px",
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: "24px", margin: "0 0 12px" }}>Concept Not Found</h1>
      <p style={{ maxWidth: "460px", color: "var(--muted)", margin: "0 0 24px" }}>
        The topic or session path you are looking for does not exist in this workspace. Let&apos;s return to learning.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to Sessions
      </Link>
    </div>
  );
}

