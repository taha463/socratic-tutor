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
  concepts: Array<{
    conceptId: string;
    score: number;
    decayedScore: number;
    attempts: number;
  }>;
  recentSessions: Array<{
    id: string;
    topic: string;
    startedAt: string;
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

  // Practice items
  const practiceItems = [
    { name: "Graphs", value: 35, width: "35%", fill: "#FFFDFB", border: "2px solid #E8725A", last: "Oct 18" },
    { name: "Pointers", value: 41, width: "41%", fill: "#FFFDFB", border: "2px solid #E8725A", last: "Oct 29" },
    { name: "Gradient descent", value: 57, width: "57%", fill: "#E8725A", border: "0", last: "Oct 27" },
    { name: "Hash maps", value: 63, width: "63%", fill: "#E8725A", border: "0", last: "Oct 30" },
    { name: "Binary trees", value: 68, width: "68%", fill: "#E8725A", border: "0", last: "Oct 12" },
  ];

  // Calendar cells for October
  const perDay: Record<number, number> = { 1: 1, 3: 2, 5: 1, 6: 1, 8: 2, 9: 1, 12: 1, 15: 1, 18: 1, 25: 1, 26: 1, 27: 2, 28: 1, 29: 1, 30: 1 };
  const calendarCells = [];
  for (let i = 0; i < 35; i++) {
    const day = i - 2;
    if (day < 1 || day > 31) {
      calendarCells.push({ label: "", bg: "transparent", color: "#6B5F59", border: "0" });
      continue;
    }
    const n = perDay[day] || 0;
    const future = day > 30;
    const today = day === 30;
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

  // Recent session records
  const recentSessionRows = [
    { date: "Oct 30", concept: "Hash maps", max: 4, hints: 2, time: "22 min", result: "Building", color: "#2B2320" },
    { date: "Oct 29", concept: "Pointers", max: 5, hints: 3, time: "18 min", result: "Needs another go", color: "#6B5F59" },
    { date: "Oct 28", concept: "Recursion", max: 2, hints: 1, time: "25 min", result: "Mastered", color: "#B93E29" },
    { date: "Oct 27", concept: "Gradient descent", max: 4, hints: 2, time: "20 min", result: "Building", color: "#2B2320" },
    { date: "Oct 27", concept: "SQL joins", max: 2, hints: 1, time: "14 min", result: "Mastered", color: "#B93E29" },
  ];

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
              Today
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
                {data ? data.sessionCount : "18"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>On 15 of 30 days</div>
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
                {data ? data.streakDays : 6} <span style={{ fontSize: "18px", fontWeight: 400, letterSpacing: 0 }}>days</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Since Oct 25, your longest this month</div>
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
              <div style={{ color: "var(--muted)", fontSize: "13px" }}>Down from 3.1 in May</div>
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
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
              <svg viewBox="0 0 500 500" role="img" aria-label="Wagon wheel of mastery by concept" style={{ width: "100%", maxWidth: "500px", height: "auto", display: "block" }}>
                <circle cx="250" cy="250" r="55.5" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="250" cy="250" r="87" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="250" cy="250" r="118.5" fill="none" stroke="#E5DED7" strokeWidth="1" />
                <circle cx="250" cy="250" r="150" fill="none" stroke="#D6CCC3" strokeWidth="1" />
                <text x="254" y="191" fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59">25</text>
                <text x="254" y="160" fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59">50</text>
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
                <g fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59">
                  <text x="250.0" y="94.0" textAnchor="middle">82%</text>
                  <text x="351.1" y="126.8" textAnchor="start">68%</text>
                  <text x="413.6" y="212.8" textAnchor="start">74%</text>
                  <text x="413.6" y="319.2" textAnchor="start">41%</text>
                  <text x="351.1" y="405.2" textAnchor="start">57%</text>
                  <text x="250.0" y="438.0" textAnchor="middle">88%</text>
                  <text x="148.9" y="405.2" textAnchor="end">91%</text>
                  <text x="86.4" y="319.2" textAnchor="end">63%</text>
                  <text x="86.4" y="212.8" textAnchor="end">77%</text>
                  <text x="148.9" y="126.8" textAnchor="end">35%</text>
                </g>
              </svg>
            </div>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              <span className="fig" style={{ color: "var(--ink)", fontWeight: 500 }}>3 of 10</span> concepts mastered. Pointers and Graphs are the gaps to close next.
            </p>
          </div>

          {/* Right charts column */}
          <div style={{ flex: "7 1 560px", display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
            {/* Month-by-month chart */}
            <div className="card">
              <h2 style={{ fontSize: "18px" }}>Average mastery, month by month</h2>
              <p style={{ margin: "4px 0 12px", color: "var(--muted)" }}>May to October, across every concept you have practised.</p>
              <svg viewBox="0 0 580 220" role="img" aria-label="Line chart" style={{ width: "100%", height: "auto", display: "block" }}>
                <g stroke="#E5DED7" strokeWidth="1">
                  <line x1="40" y1="20" x2="560" y2="20" />
                  <line x1="40" y1="60" x2="560" y2="60" />
                  <line x1="40" y1="100" x2="560" y2="100" />
                  <line x1="40" y1="140" x2="560" y2="140" />
                  <line x1="40" y1="180" x2="560" y2="180" stroke="#D6CCC3" />
                </g>
                <g fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59" textAnchor="end">
                  <text x="32" y="24">100</text>
                  <text x="32" y="64">75</text>
                  <text x="32" y="104">50</text>
                  <text x="32" y="144">25</text>
                  <text x="32" y="184">0</text>
                </g>
                <polygon points="40,130.4 140,117.6 240,106.4 340,95.2 440,82.4 540,71.2 540,180 40,180" fill="#E8725A" fillOpacity="0.10" />
                <polyline points="40,130.4 140,117.6 240,106.4 340,95.2 440,82.4 540,71.2" fill="none" stroke="#B93E29" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="540" cy="71.2" r="5" fill="#B93E29" stroke="#FFFDFB" strokeWidth="2" />
                <text x="540" y="55" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="13" fontWeight="500" fill="#2B2320">68%</text>
                <text x="40" y="118" textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="12" fill="#6B5F59">31%</text>
                <g fontFamily="Onest, sans-serif" fontSize="13" fill="#6B5F59" textAnchor="middle">
                  <text x="40" y="206">May</text>
                  <text x="140" y="206">Jun</text>
                  <text x="240" y="206">Jul</text>
                  <text x="340" y="206">Aug</text>
                  <text x="440" y="206">Sep</text>
                  <text x="540" y="206">Oct</text>
                </g>
              </svg>
            </div>

            {/* How much help you needed */}
            <div className="card">
              <h2 style={{ fontSize: "18px" }}>How much help you needed</h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                Share of each week&apos;s tutor turns, by how much the tutor had to show you. More dark is better.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", margin: "14px 0 16px", fontSize: "13px", color: "var(--muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#B93E29" }} />
                  Worked it out yourself
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#E8725A" }} />
                  Guided by an analogy or visual
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#F8CFC3" }} />
                  Shown a worked step
                </span>
              </div>
              <div role="img" aria-label="Stacked bars by week" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { range: "Oct 1 to 4", a: "38%", b: "46%", c: "16%" },
                  { range: "Oct 5 to 11", a: "44%", b: "43%", c: "13%" },
                  { range: "Oct 12 to 18", a: "49%", b: "40%", c: "11%" },
                  { range: "Oct 19 to 25", a: "55%", b: "36%", c: "9%" },
                  { range: "Oct 26 to 30", a: "61%", b: "32%", c: "7%" },
                ].map((row) => (
                  <div key={row.range} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "76px", flexShrink: 0, fontSize: "13px", color: "var(--muted)" }}>{row.range}</div>
                    <div style={{ flex: 1, display: "flex", gap: "2px", height: "30px" }}>
                      <div className="fig" style={{ width: row.a, background: "#B93E29", color: "#fff", borderRadius: "6px 0 0 6px", display: "flex", alignItems: "center", paddingLeft: "10px", fontSize: "12px", boxSizing: "border-box" }}>{row.a}</div>
                      <div className="fig" style={{ width: row.b, background: "#E8725A", color: "#2B2320", display: "flex", alignItems: "center", paddingLeft: "10px", fontSize: "12px", boxSizing: "border-box" }}>{row.b}</div>
                      <div className="fig" style={{ width: row.c, background: "#F8CFC3", color: "#2B2320", borderRadius: "0 6px 6px 0", display: "flex", alignItems: "center", paddingLeft: "10px", fontSize: "12px", boxSizing: "border-box" }}>{row.c}</div>
                    </div>
                  </div>
                ))}
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
                      <td style={{ fontWeight: 500 }}>{s.concept}</td>
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

