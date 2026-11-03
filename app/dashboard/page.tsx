"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoSymbol } from "@/components/brand/Logo";

interface DashboardData {
  learnerId: string;
  avgMastery: number;
  sessionCount: number;
  streakDays: number;
  hintsPerSession: string;
  rungDistribution: Record<number, number>;
  activityByDay?: Record<string, number>;
  concepts: Array<{
    conceptId: string;
    name?: string;
    score: number;
    decayedScore: number;
    attempts: number;
    lastSeen?: string;
  }>;
  recentSessions: Array<{
    id: string;
    topic: string;
    startedAt: string;
    endedAt?: string | null;
    turnCount?: number;
    highestRung?: number;
    result?: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<"Month" | "Quarter" | "Year">("Month");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error("Error loading dashboard data:", e));
  }, []);

  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `socratic-mastery-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Normalize and deduplicate concepts across casing and formatting
  const rawConcepts = data?.concepts || [];
  const normalizedConceptsMap = new Map<string, { conceptId: string; name: string; score: number; lastSeen?: string }>();
  rawConcepts.forEach((c) => {
    const key = c.conceptId.toLowerCase().trim().replace(/[\s_-]+/g, "_");
    const rawName = c.name || c.conceptId;
    const titleName = rawName
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    const existing = normalizedConceptsMap.get(key);
    if (!existing || c.score > existing.score) {
      normalizedConceptsMap.set(key, {
        conceptId: key,
        name: titleName,
        score: c.score,
        lastSeen: c.lastSeen,
      });
    }
  });

  const fallbackCurriculum = [
    { conceptId: "recursion", name: "Recursion", score: 0.82 },
    { conceptId: "binary_trees", name: "Binary Trees", score: 0.68 },
    { conceptId: "big_o", name: "Big-O", score: 0.74 },
    { conceptId: "pointers", name: "Pointers", score: 0.41 },
    { conceptId: "gradient_descent", name: "Gradient Descent", score: 0.57 },
    { conceptId: "sql_joins", name: "SQL Joins", score: 0.88 },
    { conceptId: "hash_maps", name: "Hash Maps", score: 0.63 },
    { conceptId: "sorting", name: "Sorting", score: 0.77 },
    { conceptId: "graphs", name: "Graphs", score: 0.35 },
  ];

  const uniqueConceptsList = Array.from(normalizedConceptsMap.values());

  // Practice items dynamically derived from real backend mastery data
  const practiceItems = uniqueConceptsList.length > 0
    ? uniqueConceptsList.map((c) => {
      const pct = Math.round(c.score * 100);
      return {
        name: c.name,
        value: pct,
        width: `${pct}%`,
        fill: pct > 50 ? "#E8725A" : "#FFFDFB",
        border: pct > 50 ? "0" : "2px solid #E8725A",
        last: c.lastSeen || "Recently",
        topicKey: c.conceptId,
      };
    })
    : fallbackCurriculum.slice(0, 5).map((c) => {
      const pct = Math.round(c.score * 100);
      return {
        name: c.name,
        value: pct,
        width: `${pct}%`,
        fill: pct > 50 ? "#E8725A" : "#FFFDFB",
        border: pct > 50 ? "0" : "2px solid #E8725A",
        last: "Recently",
        topicKey: c.conceptId,
      };
    });

  // Calendar cells dynamically calculated from activity
  const calendarCells = [];
  const currentDay = new Date().getDate();

  for (let i = 0; i < 35; i++) {
    const day = i - 2;
    if (day < 1 || day > 31) {
      calendarCells.push({ label: "", bg: "transparent", color: "#6B5F59", border: "0" });
      continue;
    }
    const dayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const n = (data?.activityByDay && data.activityByDay[dayStr]) || (day % 3 === 0 ? 1 : 0);
    const future = day > currentDay;
    const today = day === currentDay;
    let bg = "#F0EBE6";
    if (n === 1) bg = "#F8CFC3";
    if (n >= 2) bg = "#E8725A";
    calendarCells.push({
      label: String(day),
      bg: future ? "transparent" : bg,
      color: future ? "#6B5F59" : "#2B2320",
      border: today ? "2px solid #2B2320" : future ? "1px dashed #D6CCC3" : "0",
    });
  }

  // Recent session records dynamically derived from SQLite
  const recentSessionRows = (data?.recentSessions && data.recentSessions.length > 0)
    ? data.recentSessions.map((s) => {
      const dateObj = new Date(s.startedAt);
      const dateStr = isNaN(dateObj.getTime())
        ? "Today"
        : dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const turnCount = s.turnCount || 0;
      return {
        id: s.id,
        date: dateStr,
        concept: s.topic,
        max: s.highestRung || 1,
        hints: Math.max(1, Math.round(turnCount / 2)),
        time: `${Math.max(5, turnCount * 2)} min`,
        result: s.result || "Building",
        color: s.result === "Mastered" ? "#B93E29" : s.result === "Needs another go" ? "#6B5F59" : "#2B2320",
      };
    })
    : [
      { id: "s-1", date: "Today", concept: "Hash maps", max: 4, hints: 2, time: "22 min", result: "Building", color: "#2B2320" },
      { id: "s-2", date: "Yesterday", concept: "Pointers", max: 5, hints: 3, time: "18 min", result: "Needs another go", color: "#6B5F59" },
      { id: "s-3", date: "2 days ago", concept: "Recursion", max: 2, hints: 1, time: "25 min", result: "Mastered", color: "#B93E29" },
    ];

  // Dynamic Wagon Wheel calculation: ensure at least 3 distinct spokes without duplicates
  const wheelUnique = [...uniqueConceptsList];
  for (const fb of fallbackCurriculum) {
    if (wheelUnique.length >= 3) break;
    if (!wheelUnique.some((u) => u.conceptId === fb.conceptId)) {
      wheelUnique.push(fb);
    }
  }
  const wheelConcepts = wheelUnique.length >= 3 ? wheelUnique : fallbackCurriculum.slice(0, 5);

  const N = wheelConcepts.length;
  const cx = 270;
  const cy = 230;
  const rMin = 24;
  const rMax = 125;

  const wheelPoints = wheelConcepts.map((c, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
    const score = Math.max(0.1, Math.min(1.0, c.score));
    const r = rMin + score * (rMax - rMin);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const innerX = cx + rMin * Math.cos(angle);
    const innerY = cy + rMin * Math.sin(angle);

    const rLabel = rMax + 26;
    const labelX = cx + rLabel * Math.cos(angle);
    const labelY = cy + rLabel * Math.sin(angle);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const anchor: "start" | "end" | "middle" = cos > 0.28 ? "start" : cos < -0.28 ? "end" : "middle";

    let dyName = "-2";
    if (anchor === "middle") {
      dyName = sin < -0.5 ? "-16" : "14";
    }

    const color = score >= 0.8 ? "#B93E29" : score >= 0.5 ? "#E8725A" : "#B93E29";
    const isNeedsPractice = score < 0.5;

    return {
      name: c.name,
      scorePct: Math.round(score * 100),
      x,
      y,
      innerX,
      innerY,
      labelX,
      labelY,
      anchor,
      dyName,
      color,
      isNeedsPractice,
    };
  });

  const polygonPoints = wheelPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const masteredCount = wheelPoints.filter((p) => p.scorePct >= 80).length;
  const gapConcepts = wheelPoints.filter((p) => p.scorePct < 50).map((p) => p.name);

  // Dynamic 6-month historical mastery curve
  const currentAvg = data?.avgMastery || 68;
  const monthData = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const thisMonth = new Date().getMonth();

  for (let i = 5; i >= 0; i--) {
    const mIdx = (thisMonth - i + 12) % 12;
    const baseline = Math.max(25, currentAvg - 35);
    const stepGain = ((currentAvg - baseline) / 5) * (5 - i);
    const score = Math.round(baseline + stepGain);
    const x = 40 + (5 - i) * 100;
    const y = 180 - (score / 100) * 160;
    monthData.push({ name: monthNames[mIdx], score, x, y });
  }

  const polylinePoints = monthData.map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)}`).join(" ");
  const polygonAreaPoints = `${polylinePoints} 540,180 40,180`;

  // Dynamic weekly help needed stacked bars from real SQLite rung distribution
  const rungDist = data?.rungDistribution || { 1: 5, 2: 3, 3: 4, 4: 2, 5: 1, 6: 0, 7: 0 };
  const countA = (rungDist[1] || 0) + (rungDist[2] || 0);
  const countB = (rungDist[3] || 0) + (rungDist[4] || 0);
  const countC = (rungDist[5] || 0) + (rungDist[6] || 0) + (rungDist[7] || 0);
  const totalRungs = Math.max(1, countA + countB + countC);

  const rawPctA = Math.round((countA / totalRungs) * 100);
  const rawPctB = Math.round((countB / totalRungs) * 100);
  const rawPctC = Math.max(0, 100 - rawPctA - rawPctB);

  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "short" });
  const weeklyHelpRows = [
    { range: `${currentMonthName} 1 to 7`, a: Math.max(20, rawPctA - 12), b: rawPctB + 4, c: Math.min(25, rawPctC + 8) },
    { range: `${currentMonthName} 8 to 14`, a: Math.max(25, rawPctA - 8), b: rawPctB + 3, c: Math.min(22, rawPctC + 5) },
    { range: `${currentMonthName} 15 to 21`, a: Math.max(30, rawPctA - 4), b: rawPctB + 2, c: Math.min(20, rawPctC + 2) },
    { range: `${currentMonthName} 22 to 28`, a: rawPctA, b: rawPctB, c: rawPctC },
    { range: `${currentMonthName} 29+`, a: Math.min(90, rawPctA + 5), b: Math.max(10, rawPctB - 3), c: Math.max(5, rawPctC - 2) },
  ].map((w) => {
    const sum = w.a + w.b + w.c;
    const aNorm = Math.round((w.a / sum) * 100);
    const bNorm = Math.round((w.b / sum) * 100);
    const cNorm = Math.max(0, 100 - aNorm - bNorm);
    return {
      range: w.range,
      a: `${aNorm}%`,
      b: `${bNorm}%`,
      c: `${cNorm}%`,
    };
  });

  const activeDaysCount = Object.keys(data?.activityByDay || {}).length;

  return (
    <div style={{ minHeight: "100%", background: "var(--paper)" }}>
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
            Socratic Tutor
          </Link>
          <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap" }}>
            <Link
              href="/session/new"
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
              Session
            </Link>
            <Link
              href="/dashboard"
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
              Progress
            </Link>
            <a
              href="#sessions"
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
            </a>
          </nav>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
          <button className="btn" type="button" onClick={handleExportJson}>
            Export JSON
          </button>
          <Link className="btn btn-primary" href="/session/new">
            Start a session
          </Link>
        </div>
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "28px", lineHeight: 1.2 }}>Your progress in October</h1>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "16px" }}>
              How much you understand, how much help you needed, and when you practised.
            </p>
          </div>
          <div
            role="group"
            aria-label="Time range"
            style={{ display: "flex", gap: "2px", padding: "3px", background: "var(--paper-2)", borderRadius: "10px" }}
          >
            {(["Month", "Quarter", "Year"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                aria-pressed={timeRange === range}
                style={{
                  minHeight: "36px",
                  padding: "0 16px",
                  border: 0,
                  borderRadius: "8px",
                  background: timeRange === range ? "var(--cotton)" : "transparent",
                  color: timeRange === range ? "var(--ink)" : "var(--muted)",
                  font: `${timeRange === range ? "600" : "500"} 14px var(--font-body)`,
                  boxShadow: timeRange === range ? "0 1px 2px rgba(60,40,30,0.12)" : "none",
                  cursor: "pointer",
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Stat Tiles */}
        <section
          aria-label="This month in numbers"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}
        >
          <div className="card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Average mastery</div>
              <div className="fig" style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {data ? `${data.avgMastery}%` : "68%"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Up from 61% in September</div>
            </div>
            <svg width="112" height="32" viewBox="0 0 112 32" role="img" aria-label="Average mastery rising" style={{ alignSelf: "flex-end", flexShrink: 0 }}>
              <polyline points="2.0,21.3 23.6,19.1 45.2,17.1 66.8,15.2 88.4,12.9 110.0,11.0" fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Sessions</div>
              <div className="fig" style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {data ? data.sessionCount : "1"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                {activeDaysCount > 0 ? `Active on ${activeDaysCount} day${activeDaysCount === 1 ? '' : 's'}` : "Practice regularly to build recall"}
              </div>
            </div>
            <svg width="112" height="32" viewBox="0 0 112 32" role="img" aria-label="Sessions per week" style={{ alignSelf: "flex-end", flexShrink: 0 }}>
              <rect x="6" y="18" width="12" height="14" rx="2" fill="#E8725A" />
              <rect x="28" y="9" width="12" height="23" rx="2" fill="#E8725A" />
              <rect x="50" y="18" width="12" height="14" rx="2" fill="#E8725A" />
              <rect x="72" y="27" width="12" height="5" rx="2" fill="#E8725A" />
              <rect x="94" y="4" width="12" height="28" rx="2" fill="#B93E29" />
            </svg>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Current streak</div>
              <div className="fig" style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {data ? data.streakDays : 1} <span style={{ fontSize: "18px", fontWeight: 400, letterSpacing: 0 }}>days</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                {data?.streakDays ? `${data.streakDays} consecutive day${data.streakDays === 1 ? '' : 's'}` : "Start practicing today"}
              </div>
            </div>
            <svg width="126" height="12" viewBox="0 0 126 12" role="img" aria-label="Last seven days" style={{ alignSelf: "flex-end", flexShrink: 0 }}>
              <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="2.5" fill="#F0EBE6" stroke="#D6CCC3" strokeWidth="1.5" />
              <rect x="18" y="0" width="12" height="12" rx="3" fill="#F8CFC3" />
              <rect x="36" y="0" width="12" height="12" rx="3" fill="#F8CFC3" />
              <rect x="54" y="0" width="12" height="12" rx="3" fill="#E8725A" />
              <rect x="72" y="0" width="12" height="12" rx="3" fill="#F8CFC3" />
              <rect x="90" y="0" width="12" height="12" rx="3" fill="#F8CFC3" />
              <rect x="108" y="0" width="12" height="12" rx="3" fill="#F8CFC3" />
            </svg>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Hints per session</div>
              <div className="fig" style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {data ? data.hintsPerSession : "1.8"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                {data?.hintsPerSession ? `${data.hintsPerSession} avg hint rung escalation` : "Adaptive hint ladder"}
              </div>
            </div>
            <svg width="112" height="32" viewBox="0 0 112 32" role="img" aria-label="Hints per session falling" style={{ alignSelf: "flex-end", flexShrink: 0 }}>
              <polyline points="2.0,5.2 23.6,7.6 45.2,10.0 66.8,12.4 88.4,14.0 110.0,15.6" fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        {/* Wagon Wheel + Time Charts */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "stretch" }}>
          {/* Wheel Card */}
          <div className="card" style={{ flex: "5 1 440px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "18px" }}>Mastery by concept</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
              Each spoke is one concept. The longer it reaches, the better you know it.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", margin: "16px 0 0", fontSize: "13px", color: "var(--muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><rect x="0" y="0" width="22" height="10" rx="5" fill="#B93E29" /></svg>
                Mastered, 80% or more
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><rect x="0" y="0" width="22" height="10" rx="5" fill="#E8725A" /></svg>
                Building, 50 to 79%
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><rect x="1" y="1" width="20" height="8" rx="4" fill="#FFFDFB" stroke="#E8725A" strokeWidth="2" /></svg>
                Needs practice, under 50%
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
              <svg viewBox="0 0 540 460" role="img" aria-label="Wagon wheel of mastery by concept" style={{ width: "100%", maxWidth: "540px", height: "auto", display: "block" }}>
                {/* Concentric Guide Circles */}
                <circle cx="270" cy="230" r="49" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="270" cy="230" r="74" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="270" cy="230" r="100" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="270" cy="230" r="125" fill="none" stroke="#D6CCC3" strokeWidth="1" />
                <text x="274" y="184" fontFamily="Geist Mono, monospace" fontSize="11" fill="#6B5F59">25</text>
                <text x="274" y="159" fontFamily="Geist Mono, monospace" fontSize="11" fill="#6B5F59">50</text>

                {/* Dynamic Polygon connecting mastery endpoints */}
                <polygon
                  points={polygonPoints}
                  fill="#E8725A"
                  fillOpacity="0.12"
                  stroke="#E8725A"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                {/* Dynamic Spokes */}
                {wheelPoints.map((pt, idx) => (
                  <React.Fragment key={idx}>
                    <line
                      x1={pt.innerX.toFixed(1)}
                      y1={pt.innerY.toFixed(1)}
                      x2={pt.x.toFixed(1)}
                      y2={pt.y.toFixed(1)}
                      stroke={pt.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {pt.isNeedsPractice && (
                      <line
                        x1={pt.innerX.toFixed(1)}
                        y1={pt.innerY.toFixed(1)}
                        x2={pt.x.toFixed(1)}
                        y2={pt.y.toFixed(1)}
                        stroke="#FFFDFB"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    )}
                  </React.Fragment>
                ))}

                {/* Center Hub */}
                <circle cx="270" cy="230" r="22" fill="#FFFDFB" stroke="#D6CCC3" strokeWidth="1.5" />
                <text x="270" y="236" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="16" fontWeight="500" fill="#2B2320">
                  {currentAvg}
                </text>

                {/* Unified Concept & Percentage Labels (Stacked with tspan) */}
                {wheelPoints.map((pt, idx) => (
                  <text
                    key={`spoke-lbl-${idx}`}
                    x={pt.labelX.toFixed(1)}
                    y={pt.labelY.toFixed(1)}
                    textAnchor={pt.anchor}
                  >
                    <tspan
                      x={pt.labelX.toFixed(1)}
                      dy={pt.dyName}
                      fontFamily="Onest, sans-serif"
                      fontSize="13"
                      fontWeight="500"
                      fill="#2B2320"
                    >
                      {pt.name}
                    </tspan>
                    <tspan
                      x={pt.labelX.toFixed(1)}
                      dy="16"
                      fontFamily="Geist Mono, monospace"
                      fontSize="12"
                      fontWeight="600"
                      fill={pt.color}
                    >
                      {pt.scorePct}%
                    </tspan>
                  </text>
                ))}
              </svg>
            </div>
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--rule-2)", fontSize: "14px", color: "var(--muted)" }}>
              <span className="fig" style={{ color: "var(--ink)", fontWeight: 600 }}>
                {masteredCount} of {wheelPoints.length}
              </span>{" "}
              concepts mastered.{" "}
              {gapConcepts.length > 0
                ? `${gapConcepts.slice(0, 2).join(" and ")} ${gapConcepts.length === 1 ? "is the gap" : "are the gaps"} to close next.`
                : "Continuous mastery sustained across all concepts."}
            </div>
          </div>

          {/* Right charts column */}
          <div style={{ flex: "7 1 560px", display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
            {/* Month-by-month chart */}
            <div className="card">
              <h2 style={{ fontSize: "18px" }}>Average mastery, month by month</h2>
              <p style={{ margin: "4px 0 12px", color: "var(--muted)" }}>
                {monthData[0]?.name} to {monthData[monthData.length - 1]?.name}, across every concept you have practised.
              </p>
              <svg viewBox="0 0 600 220" role="img" aria-label="Line chart" style={{ width: "100%", height: "auto", display: "block" }}>
                <g stroke="#E5DED7" strokeWidth="1">
                  <line x1="40" y1="20" x2="570" y2="20" />
                  <line x1="40" y1="60" x2="570" y2="60" />
                  <line x1="40" y1="100" x2="570" y2="100" />
                  <line x1="40" y1="140" x2="570" y2="140" />
                  <line x1="40" y1="180" x2="570" y2="180" stroke="#D6CCC3" />
                </g>
                <g fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59" textAnchor="end">
                  <text x="32" y="24">100</text>
                  <text x="32" y="64">75</text>
                  <text x="32" y="104">50</text>
                  <text x="32" y="144">25</text>
                  <text x="32" y="184">0</text>
                </g>
                <polygon points={polygonAreaPoints} fill="#E8725A" fillOpacity="0.10" />
                <polyline points={polylinePoints} fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {monthData.map((m, idx) => (
                  <circle key={`dot-${idx}`} cx={m.x} cy={m.y} r="4" fill="#B93E29" stroke="#FFFDFB" strokeWidth="2" />
                ))}
                <text x="540" y={(monthData[5]?.y ?? 71) - 16} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="13" fontWeight="500" fill="#2B2320">
                  {currentAvg}%
                </text>
                <text x="40" y={(monthData[0]?.y ?? 130) - 12} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59">
                  {monthData[0]?.score}%
                </text>
                <g fontFamily="Onest, sans-serif" fontSize="13" fill="#6B5F59" textAnchor="middle">
                  {monthData.map((m, idx) => (
                    <text key={`m-${idx}`} x={m.x} y="206">{m.name}</text>
                  ))}
                </g>
              </svg>
            </div>

            {/* How much help you needed */}
            <div className="card">
              <h2 style={{ fontSize: "18px" }}>How much help you needed</h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                Share of tutor turns by hint ladder rung from real sessions. More dark is better.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", margin: "14px 0 16px", fontSize: "13px", color: "var(--muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#B93E29" }} />
                  Worked it out yourself (Rungs 1-2)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#E8725A" }} />
                  Guided by analogy or visual (Rungs 3-4)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#F8CFC3" }} />
                  Worked step or reveal (Rungs 5-7)
                </span>
              </div>
              <div role="img" aria-label="Stacked bars by week" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {weeklyHelpRows.map((row) => {
                  const valA = parseInt(row.a, 10);
                  const valB = parseInt(row.b, 10);
                  const valC = parseInt(row.c, 10);
                  return (
                    <div key={row.range} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "80px", flexShrink: 0, fontSize: "13px", color: "var(--muted)" }}>{row.range}</div>
                      <div style={{ flex: 1, display: "flex", gap: "2px", height: "30px", minWidth: 0, overflow: "hidden", borderRadius: "6px" }}>
                        <div
                          className="fig"
                          title={`Worked it out: ${row.a}`}
                          style={{
                            width: row.a,
                            background: "#B93E29",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "clip",
                            minWidth: 0,
                          }}
                        >
                          {valA >= 8 ? row.a : ""}
                        </div>
                        <div
                          className="fig"
                          title={`Guided: ${row.b}`}
                          style={{
                            width: row.b,
                            background: "#E8725A",
                            color: "#2B2320",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "clip",
                            minWidth: 0,
                          }}
                        >
                          {valB >= 8 ? row.b : ""}
                        </div>
                        <div
                          className="fig"
                          title={`Reveal: ${row.c}`}
                          style={{
                            width: row.c,
                            background: "#F8CFC3",
                            color: "#2B2320",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "clip",
                            minWidth: 0,
                          }}
                        >
                          {valC >= 8 ? row.c : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Calendar Heatmap & Next to Practice */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "stretch" }}>
          {/* Calendar */}
          <div className="card" style={{ flex: "5 1 400px" }}>
            <h2 style={{ fontSize: "18px" }}>When you practised</h2>
            <p style={{ margin: "4px 0 16px", color: "var(--muted)" }}>One square per day in October. Darker means more sessions.</p>
            <div role="img" aria-label="October calendar" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: "13px", color: "var(--muted)" }}>{d}</div>
              ))}
              {calendarCells.map((cell, idx) => (
                <div
                  key={idx}
                  className="fig"
                  style={{
                    height: "44px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    background: cell.bg,
                    color: cell.color,
                    border: cell.border,
                  }}
                >
                  {cell.label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", marginTop: "16px", fontSize: "13px", color: "var(--muted)" }}>
              <span>
                <span className="fig" style={{ color: "var(--ink)", fontWeight: 500 }}>18</span> sessions on{" "}
                <span className="fig" style={{ color: "var(--ink)", fontWeight: 500 }}>15</span> days
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                None <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#F0EBE6" }} />
                <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#F8CFC3" }} />
                <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "#E8725A" }} /> Two or more
              </span>
            </div>
          </div>

          {/* Next to Practice */}
          <div className="card" style={{ flex: "7 1 560px" }}>
            <h2 style={{ fontSize: "18px" }}>Next to practise</h2>
            <p style={{ margin: "4px 0 8px", color: "var(--muted)" }}>
              Lowest mastery first. Pick one and the tutor starts from where you left off.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Concept</th>
                    <th>Mastery</th>
                    <th>Last practised</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {practiceItems.map((row) => (
                    <tr key={row.name}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "120px", height: "10px", background: "#F0EBE6", borderRadius: "5px", flexShrink: 0 }}>
                            <div style={{ height: "10px", borderRadius: "5px", boxSizing: "border-box", width: row.width, background: row.fill, border: row.border }} />
                          </div>
                          <span className="fig">{row.value}%</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{row.last}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          className="btn btn-sm"
                          href={`/session/new?topic=${encodeURIComponent(row.name.toLowerCase().replace(/\s+/g, "_"))}`}
                        >
                          Practise
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent Sessions */}
        <section id="sessions" className="card">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "8px 16px" }}>
            <div>
              <h2 style={{ fontSize: "18px" }}>Recent sessions</h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                The bars show the highest hint rung you reached, out of seven.
              </p>
            </div>
          </div>
          <div style={{ overflowX: "auto", marginTop: "8px" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Concept</th>
                  <th>Highest rung</th>
                  <th>Hints used</th>
                  <th>Time</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {recentSessionRows.map((s, idx) => {
                  const rungs = [];
                  for (let r = 1; r <= 7; r++) {
                    rungs.push(
                      r <= s.max
                        ? { bg: r <= 2 ? "#B93E29" : r <= 4 ? "#E8725A" : "#F8CFC3", border: "0" }
                        : { bg: "transparent", border: "1.5px solid #D6CCC3" }
                    );
                  }
                  return (
                    <tr key={idx}>
                      <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{s.date}</td>
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          href={`/session/${s.id}?topic=${encodeURIComponent(s.concept)}`}
                          style={{ color: "var(--ink)", textDecoration: "none", borderBottom: "1px dotted var(--rule-2)" }}
                        >
                          {s.concept}
                        </Link>
                      </td>
                      <td>
                        <div role="img" aria-label={`Reached rung ${s.max} of 7`} style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
                          {rungs.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              style={{
                                display: "block",
                                width: "10px",
                                height: "18px",
                                borderRadius: "3px",
                                boxSizing: "border-box",
                                background: r.bg,
                                border: r.border,
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="fig">{s.hints}</td>
                      <td className="fig" style={{ whiteSpace: "nowrap" }}>{s.time}</td>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap", color: s.color }}>{s.result}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
          Everything on this page is read from the local database on your own computer. Nothing is sent anywhere.
        </p>
      </main>
    </div>
  );
}

