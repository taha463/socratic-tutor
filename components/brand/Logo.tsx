import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Socratic Tutor Brand Mark: The Dialogue Knot
 * Two inquisitive dialogue brackets embracing the central insight spark.
 */
export function LogoSymbol({ size = 28, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      role="img"
      aria-label="Socratic Tutor mark"
    >
      {/* Upper-left dialogue bracket */}
      <path
        fill="var(--ink)"
        d="M 128,32 A 96,96 0 0 0 32,128 A 96,96 0 0 0 68,190 L 92,166 A 64,64 0 0 1 64,128 A 64,64 0 0 1 128,64 Z"
      />
      {/* Lower-right dialogue bracket (180° rotation) */}
      <path
        fill="var(--ink)"
        d="M 128,224 A 96,96 0 0 0 224,128 A 96,96 0 0 0 188,66 L 164,90 A 64,64 0 0 1 192,128 A 64,64 0 0 1 128,192 Z"
      />
      {/* Central Insight Spark */}
      <circle cx="128" cy="128" r="24" fill="var(--coral)" />
    </svg>
  );
}

export function LogoLockup({
  symbolSize = 28,
  fontSize = 20,
  showTagline = false,
}: {
  symbolSize?: number;
  fontSize?: number;
  showTagline?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <LogoSymbol size={symbolSize} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: `${fontSize}px`,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Socratic Tutor
        </span>
        {showTagline && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: "3px",
            }}
          >
            Learn by working it out
          </span>
        )}
      </div>
    </div>
  );
}
