import { describe, it, expect } from "./test-utils";
import { certificateService, sessionService } from "../backend/index";

describe("Proof-of-Mastery Certificate Generator Tests", () => {
  it("generates a cryptographically hashed certificate for a completed session", () => {
    const sessionId = "sess-cert-test-" + Date.now();
    sessionService.getSession(sessionId, "Recursion");

    const cert = certificateService.generateCertificate(sessionId, "default-learner", "Recursion");

    expect(cert.certificateId.startsWith("CERT-SOC-")).toBe(true);
    expect(cert.topic).toBe("Recursion");
    expect(cert.masteryScore).toBeGreaterThanOrEqual(75);
    expect(cert.zeroLeakVerified).toBe(true);
    expect(cert.verificationHash.length).toBe(64); // SHA-256 hex string length
    expect(cert.agentConsensusSummary.criticVerdict).toContain("Zero-Answer-Leak");
  });
});
