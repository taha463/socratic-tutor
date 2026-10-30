"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const topic = searchParams.get("topic") || "recursion";
    const sessionId = "session-" + Math.random().toString(36).substring(2, 9);
    router.replace(`/session/${sessionId}?topic=${encodeURIComponent(topic)}`);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
      <p style={{ color: "var(--muted)", font: "500 16px var(--font-body)" }}>
        Preparing your Socratic session...
      </p>
    </div>
  );
}
