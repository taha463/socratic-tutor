"use client";

import React, { useState } from "react";
import type { ProofOfMasteryCertificate } from "@/backend/services/certificateService";

interface MasteryCertificateModalProps {
  certificate: ProofOfMasteryCertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MasteryCertificateModal: React.FC<MasteryCertificateModalProps> = ({
  certificate,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !certificate) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/session/${certificate.sessionId}?cert=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSVG = () => {
    const svgEl = document.getElementById("certificate-svg-render");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `socratic-mastery-${certificate.topic.toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: "820px",
          width: "100%",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🏆</span>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1E293B" }}>
              Verified Proof-of-Mastery Certificate
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: copied ? "#ECFDF5" : "#FFFFFF",
                border: `1px solid ${copied ? "#10B981" : "#CBD5E1"}`,
                color: copied ? "#065F46" : "#334155",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>{copied ? "✓ Link Copied!" : "📋 Copy Verification Link"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSVG}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#B93E29",
                border: "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>📥 Download SVG</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                color: "#64748B",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Certificate Canvas / SVG Container */}
        <div style={{ padding: "24px", background: "#F1F5F9", display: "flex", justifyContent: "center" }}>
          <svg
            id="certificate-svg-render"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 540"
            style={{
              width: "100%",
              maxWidth: "760px",
              height: "auto",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              borderRadius: "8px",
              background: "#FAF7F2",
            }}
          >
            {/* Outer Border with Double Inset */}
            <rect x="15" y="15" width="770" height="510" rx="8" fill="#FFFDF9" stroke="#E2D9CE" strokeWidth="2" />
            <rect x="25" y="25" width="750" height="490" rx="4" fill="none" stroke="#B93E29" strokeWidth="2" strokeDasharray="4 2" />

            {/* Corner Rosettes / Flourishes */}
            <circle cx="25" cy="25" r="8" fill="#B93E29" />
            <circle cx="775" cy="25" r="8" fill="#B93E29" />
            <circle cx="25" cy="515" r="8" fill="#B93E29" />
            <circle cx="775" cy="515" r="8" fill="#B93E29" />

            {/* Header Badge */}
            <g transform="translate(368, 48)">
              <circle cx="32" cy="32" r="30" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
              <text x="32" y="38" textAnchor="middle" fontSize="24">🏛️</text>
            </g>

            <text x="400" y="130" textAnchor="middle" fontFamily="serif" fontSize="13" letterSpacing="4" fill="#8C7E75" fontWeight="600">
              SOCRATIC TUTOR V2 • COGNITIVE SYNTHESIS PROOF
            </text>

            <text x="400" y="165" textAnchor="middle" fontFamily="serif" fontSize="26" fill="#2B2320" fontWeight="700">
              Certificate of Socratic Mastery
            </text>

            <text x="400" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#6B5F59">
              This certifies that
            </text>

            <text x="400" y="230" textAnchor="middle" fontFamily="sans-serif" fontSize="22" fill="#B93E29" fontWeight="700">
              {certificate.learnerName}
            </text>

            <text x="400" y="260" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fill="#3D3531">
              has demonstrated independent, unassisted conceptual mastery in
            </text>

            <text x="400" y="295" textAnchor="middle" fontFamily="serif" fontSize="22" fill="#1E293B" fontWeight="700">
              {certificate.topic}
            </text>

            <text x="400" y="325" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#6B5F59">
              through pure deductive inquiry, verified by zero-answer-leak quality gates.
            </text>

            {/* Multi-Agent Audit Grid */}
            <g transform="translate(60, 350)">
              <rect width="680" height="90" rx="6" fill="#FAF5EE" stroke="#E6DDD2" />

              {/* Col 1: Diagnostician */}
              <text x="85" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E3A8A">🩺 Diagnostician</text>
              <text x="85" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1D4ED8">{certificate.masteryScore}%</text>
              <text x="85" y="68" textAnchor="middle" fontSize="10" fill="#6B7280">BKT Mastery</text>

              {/* Divider */}
              <line x1="170" y1="15" x2="170" y2="75" stroke="#E2D9CE" />

              {/* Col 2: Critic Quality Gate */}
              <text x="255" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#065F46">⚖️ Critic Gate</text>
              <text x="255" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="#047857">0% Leak</text>
              <text x="255" y="68" textAnchor="middle" fontSize="10" fill="#6B7280">Direct Answer Invariant</text>

              {/* Divider */}
              <line x1="340" y1="15" x2="340" y2="75" stroke="#E2D9CE" />

              {/* Col 3: Teacher Ladder */}
              <text x="425" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#854D0E">✍️ Teacher Ladder</text>
              <text x="425" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="#B45309">Rung {certificate.ladderPeak}</text>
              <text x="425" y="68" textAnchor="middle" fontSize="10" fill="#6B7280">Peak Scaffold Level</text>

              {/* Divider */}
              <line x1="510" y1="15" x2="510" y2="75" stroke="#E2D9CE" />

              {/* Col 4: Dialogue Depth */}
              <text x="595" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#581C87">💬 Turns</text>
              <text x="595" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="#7E22CE">{certificate.turnsCompleted}</text>
              <text x="595" y="68" textAnchor="middle" fontSize="10" fill="#6B7280">Socratic Inquiries</text>
            </g>

            {/* Cryptographic Hash Footer */}
            <text x="50" y="475" fontFamily="monospace" fontSize="10" fill="#9CA3AF">
              ID: {certificate.certificateId}
            </text>
            <text x="50" y="492" fontFamily="monospace" fontSize="9" fill="#9CA3AF">
              SHA-256: {certificate.verificationHash.slice(0, 36)}...
            </text>

            <text x="750" y="475" textAnchor="end" fontFamily="sans-serif" fontSize="10" fill="#9CA3AF">
              Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
            </text>
            <text x="750" y="492" textAnchor="end" fontFamily="sans-serif" fontSize="10" fill="#10B981" fontWeight="600">
              ✓ Multi-Agent Consensus Verified
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
