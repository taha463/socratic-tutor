/**
 * TypeScript Wrapper for Sandboxed Python Execution Tracer
 * Spawns isolated python_tracer.py with strict timeout and I/O caps.
 */

import { spawn } from "node:child_process";
import path from "node:path";

export interface PythonTraceStep {
  step: number;
  line: number;
  code: string;
  rawCode: string;
  function: string;
  locals: Record<string, string>;
}

export interface PythonTraceResponse {
  success: boolean;
  error?: string | null;
  steps: PythonTraceStep[];
  stdout: string;
  totalSteps: number;
  timedOut: boolean;
}

export async function runPythonTrace(
  code: string,
  maxSteps: number = 300,
  timeoutMs: number = 4000
): Promise<PythonTraceResponse> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), "skills/trace/python_tracer.py");
    const child = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdoutData = "";
    let stderrData = "";
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          child.kill("SIGKILL");
        } catch {}
        resolve({
          success: false,
          error: `Execution timed out after ${timeoutMs / 1000} seconds. Check for heavy recursion or unbounded loops.`,
          steps: [],
          stdout: stdoutData,
          totalSteps: 0,
          timedOut: true,
        });
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("close", (code) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          return resolve(parsed);
        } catch (e: any) {
          return resolve({
            success: false,
            error: `Failed to parse execution trace: ${e?.message || "Invalid JSON output"}`,
            steps: [],
            stdout: stdoutData,
            totalSteps: 0,
            timedOut: false,
          });
        }
      }

      return resolve({
        success: false,
        error: stderrData.trim() || `Process exited with code ${code}`,
        steps: [],
        stdout: "",
        totalSteps: 0,
        timedOut: false,
      });
    });

    child.on("error", (err) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({
        success: false,
        error: `Failed to spawn Python process: ${err.message}`,
        steps: [],
        stdout: "",
        totalSteps: 0,
        timedOut: false,
      });
    });

    // Send payload
    child.stdin.write(JSON.stringify({ code, maxSteps }));
    child.stdin.end();
  });
}
