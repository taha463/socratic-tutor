"""Static HTML dashboard builder reading directly from SQLite database."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from storage.db import get_connection, init_db

DEFAULT_DASHBOARD_PATH = Path(".socratic/dashboard.html")


def compute_streak_and_stats(sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate consecutive day streak and sessions this week."""
    if not sessions:
        return {"streak_days": 0, "sessions_this_week": 0, "total_sessions": 0}

    dates = set()
    for s in sessions:
        try:
            dt = datetime.fromisoformat(s["started_at"])
            dates.add(dt.date())
        except Exception:
            continue

    sorted_dates = sorted(dates, reverse=True)
    today = datetime.now(timezone.utc).date()

    streak = 0
    cur = today
    while cur in sorted_dates:
        streak += 1
        cur = cur.fromordinal(cur.toordinal() - 1)

    # Sessions in last 7 days
    recent_count = sum(1 for d in sorted_dates if (today - d).days <= 7)

    return {
        "streak_days": streak,
        "sessions_this_week": recent_count,
        "total_sessions": len(sessions),
    }


def compute_rung_trends(turns: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate rung distribution and recent vs early average rung to track hint fading."""
    tutor_turns = [t for t in turns if t["role"] == "tutor" and t.get("rung") is not None]
    if not tutor_turns:
        return {"distribution": {}, "avg_early_rung": 1.0, "avg_recent_rung": 1.0, "fading_progress": 0.0}

    distribution: Dict[int, int] = {r: 0 for r in range(1, 8)}
    rungs = []
    for t in tutor_turns:
        r = int(t["rung"])
        distribution[r] = distribution.get(r, 0) + 1
        rungs.append(r)

    half = len(rungs) // 2
    avg_early = sum(rungs[:half]) / max(1, half) if half > 0 else rungs[0]
    avg_recent = sum(rungs[half:]) / max(1, len(rungs) - half) if half > 0 else rungs[0]
    # Positive fading progress means needing fewer hints over time!
    fading = round(avg_early - avg_recent, 2)

    return {
        "distribution": distribution,
        "avg_early_rung": round(avg_early, 2),
        "avg_recent_rung": round(avg_recent, 2),
        "fading_progress": fading,
    }


def build_dashboard(
    learner_id: str = "learner-default",
    db_path: Optional[str | Path] = None,
    output_path: Optional[str | Path] = None,
) -> Path:
    """Query SQLite and generate a standalone static HTML mastery dashboard."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    try:
        # 1. Fetch learner record
        cursor.execute("SELECT * FROM learners WHERE id = ?;", (learner_id,))
        learner = cursor.fetchone()
        learner_name = learner["name"] if learner else learner_id

        # 2. Fetch sessions
        cursor.execute("SELECT * FROM sessions WHERE learner_id = ? ORDER BY started_at DESC;", (learner_id,))
        sessions = [dict(r) for r in cursor.fetchall()]
        stats = compute_streak_and_stats(sessions)

        # 3. Fetch mastery and concepts
        cursor.execute(
            """SELECT m.concept_id, c.name, m.score, m.attempts, m.last_seen, m.updated_at
               FROM mastery m
               LEFT JOIN concepts c ON m.concept_id = c.id
               WHERE m.learner_id = ?
               ORDER BY m.score DESC;""",
            (learner_id,),
        )
        mastery_rows = [dict(r) for r in cursor.fetchall()]

        # 4. Fetch turns for this learner's sessions
        cursor.execute(
            """SELECT t.*
               FROM turns t
               JOIN sessions s ON t.session_id = s.id
               WHERE s.learner_id = ?
               ORDER BY t.ts ASC;""",
            (learner_id,),
        )
        turns = [dict(r) for r in cursor.fetchall()]
        rung_stats = compute_rung_trends(turns)

        # 5. Fetch mistakes
        cursor.execute(
            """SELECT m.concept_id, c.name, m.pattern, m.count, m.last_seen
               FROM mistakes m
               LEFT JOIN concepts c ON m.concept_id = c.id
               WHERE m.learner_id = ?
               ORDER BY m.count DESC;""",
            (learner_id,),
        )
        mistakes = [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

    # Identify weak concepts (score < 0.6)
    weak_concepts = [m for m in mastery_rows if m["score"] < 0.6]

    # Visual replays
    visual_turns = [t for t in turns if t.get("skill_used")]

    # HTML Construction
    mastery_bars_html = ""
    for m in mastery_rows:
        pct = int(m["score"] * 100)
        cname = m["name"] or m["concept_id"]
        color = "#22c55e" if pct >= 80 else ("#eab308" if pct >= 50 else "#f97316")
        mastery_bars_html += f"""
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span style="font-weight: 600; color: #f8fafc;">{cname}</span>
            <span style="color: {color}; font-weight: bold;">{pct}% ({m['attempts']} attempts)</span>
          </div>
          <div style="background: #1e293b; height: 10px; border-radius: 5px; overflow: hidden;">
            <div style="background: {color}; width: {pct}%; height: 100%; border-radius: 5px;"></div>
          </div>
        </div>
        """
    if not mastery_bars_html:
        mastery_bars_html = "<p style='color: #94a3b8;'>No concept mastery recorded yet. Start practicing with <code>/socratic teach me &lt;topic&gt;</code>!</p>"

    weak_table_html = ""
    for w in weak_concepts:
        cname = w["name"] or w["concept_id"]
        mistake_pattern = next((m["pattern"] for m in mistakes if m["concept_id"] == w["concept_id"]), "")
        pattern_sub = f"<div style='font-size: 0.8rem; color: #94a3b8; margin-top: 0.2rem;'>Flagged: {mistake_pattern}</div>" if mistake_pattern else ""
        weak_table_html += f"""
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #f8fafc;">
            {cname}
            {pattern_sub}
          </td>
          <td style="padding: 0.75rem 0.5rem; color: #f97316; font-weight: bold;">{int(w['score']*100)}%</td>
          <td style="padding: 0.75rem 0.5rem; color: #cbd5e1;">{w['attempts']}</td>
          <td style="padding: 0.75rem 0.5rem;">
            <span style="background: #0369a1; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">Recommended Next</span>
          </td>
        </tr>
        """
    if not weak_table_html:
        weak_table_html = "<tr><td colspan='4' style='padding: 1rem; color: #22c55e; text-align: center;'>✨ All concepts are in good standing! Keep up the great work.</td></tr>"

    rung_dist_html = ""
    for r in range(1, 8):
        count = rung_stats["distribution"].get(r, 0)
        rung_dist_html += f"""
        <div style="flex: 1; text-align: center; background: #0f172a; padding: 0.75rem 0.25rem; border-radius: 6px; border: 1px solid #334155;">
          <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Rung {r}</div>
          <div style="font-size: 1.25rem; font-weight: bold; color: #38bdf8; margin-top: 0.25rem;">{count}</div>
        </div>
        """

    visual_gallery_html = ""
    for vt in visual_turns:
        visual_gallery_html += f"""
        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between;">
            <strong style="color: #38bdf8;">Skill: {vt.get('skill_used', 'visual')}</strong>
            <span style="color: #64748b; font-size: 0.85rem;">{vt.get('ts', '')[:16]}</span>
          </div>
          <p style="margin: 0.5rem 0 0 0; color: #cbd5e1; font-size: 0.95rem;">{vt.get('text', '')[:120]}...</p>
        </div>
        """
    if not visual_gallery_html:
        visual_gallery_html = "<p style='color: #94a3b8;'>No visuals generated yet. As you advance through hint rungs, diagrams and traces appear here!</p>"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mastery Dashboard - Socratic Tutor v2</title>
  <style>
    :root {{
      --bg: #0b0f19;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --accent: #38bdf8;
      --accent-subtle: #0369a1;
      --green: #22c55e;
      --orange: #f97316;
    }}
    body {{
      margin: 0;
      padding: 2rem;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    .dashboard-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }}
    .stat-cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }}
    .card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }}
    @media (max-width: 768px) {{
      .grid-2 {{ grid-template-columns: 1fr; }}
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }}
  </style>
</head>
<body>
  <div class="dashboard-header">
    <div>
      <h1 style="margin: 0; font-size: 1.75rem; color: #f8fafc;">🎓 Socratic Mastery Center</h1>
      <div style="color: #94a3b8; margin-top: 0.25rem;">Learner: <strong>{learner_name}</strong></div>
    </div>
    <div style="color: #64748b; font-size: 0.9rem;">
      Last Synced: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
    </div>
  </div>

  <!-- KPI Stats -->
  <div class="stat-cards">
    <div class="card">
      <div style="color: #94a3b8; font-size: 0.85rem; text-transform: uppercase;">Active Streak</div>
      <div style="font-size: 2rem; font-weight: bold; color: var(--accent); margin-top: 0.5rem;">🔥 {stats['streak_days']} days</div>
    </div>
    <div class="card">
      <div style="color: #94a3b8; font-size: 0.85rem; text-transform: uppercase;">Sessions This Week</div>
      <div style="font-size: 2rem; font-weight: bold; color: var(--green); margin-top: 0.5rem;">{stats['sessions_this_week']}</div>
    </div>
    <div class="card">
      <div style="color: #94a3b8; font-size: 0.85rem; text-transform: uppercase;">Total Sessions</div>
      <div style="font-size: 2rem; font-weight: bold; color: #a78bfa; margin-top: 0.5rem;">{stats['total_sessions']}</div>
    </div>
    <div class="card">
      <div style="color: #94a3b8; font-size: 0.85rem; text-transform: uppercase;">Hint Fading Metric</div>
      <div style="font-size: 2rem; font-weight: bold; color: var(--orange); margin-top: 0.5rem;">
        {'+' if rung_stats['fading_progress'] >= 0 else ''}{rung_stats['fading_progress']}
      </div>
      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">(Higher = needing fewer hints over time)</div>
    </div>
  </div>

  <!-- Main Grid: Mastery & Rung Trends -->
  <div class="grid-2">
    <div class="card">
      <h2 style="margin-top: 0; font-size: 1.25rem; color: var(--accent);">📊 Concept Mastery Progression</h2>
      {mastery_bars_html}
    </div>

    <div class="card">
      <h2 style="margin-top: 0; font-size: 1.25rem; color: var(--accent);">🪜 Hint Ladder Usage Trends</h2>
      <p style="color: #94a3b8; font-size: 0.9rem;">Distribution of tutor hint rungs experienced across all turns:</p>
      <div style="display: flex; gap: 0.5rem; margin-top: 1rem; margin-bottom: 1.5rem;">
        {rung_dist_html}
      </div>
      <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155;">
        <strong style="color: #38bdf8;">Pedagogical Insight:</strong>
        <p style="margin: 0.25rem 0 0 0; color: #cbd5e1; font-size: 0.9rem;">
          Early average rung: <strong>{rung_stats['avg_early_rung']}</strong> | Recent average rung: <strong>{rung_stats['avg_recent_rung']}</strong>.
          { 'Scaffolding is successfully fading as your conceptual autonomy increases!' if rung_stats['fading_progress'] >= 0 else 'Tutor is actively providing scaffolding to strengthen foundational concepts.' }
        </p>
      </div>
    </div>
  </div>

  <!-- Bottom Grid: Weak Topics & Visual Replay -->
  <div class="grid-2">
    <div class="card">
      <h2 style="margin-top: 0; font-size: 1.25rem; color: var(--orange);">🎯 Priority Review Concepts</h2>
      <table>
        <thead>
          <tr style="border-bottom: 2px solid #334155; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase;">
            <th style="padding: 0.5rem;">Concept</th>
            <th style="padding: 0.5rem;">Mastery</th>
            <th style="padding: 0.5rem;">Attempts</th>
            <th style="padding: 0.5rem;">Action</th>
          </tr>
        </thead>
        <tbody>
          {weak_table_html}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2 style="margin-top: 0; font-size: 1.25rem; color: var(--accent);">🖼️ Visual & Trace Artifacts Replay</h2>
      {visual_gallery_html}
    </div>
  </div>
</body>
</html>"""

    # Resolve output path
    resolved_out = Path(output_path) if output_path else DEFAULT_DASHBOARD_PATH
    resolved_out.parent.mkdir(parents=True, exist_ok=True)
    with open(resolved_out, "w", encoding="utf-8") as f:
        f.write(html_content)

    return resolved_out.resolve()


def main() -> int:
    """CLI script for building dashboard."""
    parser = argparse.ArgumentParser(description="Build static Socratic Tutor mastery dashboard.")
    parser.add_argument("--learner", "-l", default="learner-default", help="Learner ID.")
    parser.add_argument("--output", "-o", default=None, help="Custom output HTML path.")
    args = parser.parse_args()

    out = build_dashboard(learner_id=args.learner, output_path=args.output)
    print(f"✔ Dashboard built successfully: file://{out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
