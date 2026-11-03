"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export function ConnectionBanner() {
  const [provider, setProvider] = useState("mock");
  const [hasKey, setHasKey] = useState(true);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((d) => {
        setProvider(d.provider);
        setHasKey(d.hasKey);
      })
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Connected successfully to ${data.provider}!`);
      } else {
        setStatusMsg(`Connection failed: ${data.error}`);
      }
    } catch (e: any) {
      setStatusMsg("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        background: "var(--paper-2)",
        borderBottom: "1px solid var(--rule-2)",
        padding: "8px 24px",
        fontSize: "13px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "4px",
            background: hasKey ? "#22c55e" : "#eab308",
          }}
        />
        <span>
          Model provider: <strong>{provider.toUpperCase()}</strong>
          {!hasKey && " (No API key found in .env — using local mock provider)"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          style={{
            background: "var(--cotton)",
            border: "1px solid var(--rule-2)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer",
            color: "var(--ink)",
          }}
        >
          {testing ? "Testing..." : "Test connection"}
        </button>
        {statusMsg && (
          <span style={{ color: statusMsg.includes("success") ? "var(--coral-deep)" : "#dc2626", fontWeight: 500 }}>
            {statusMsg}
          </span>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: "0 4px" }}
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

