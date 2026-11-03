import { describe, it, expect } from "./test-utils";
import { runSandboxedJS } from "../skills/trace/sandbox";
import { runPythonTrace } from "../skills/trace/pythonSandbox";

describe("Trace Sandbox Security & Execution Tests", () => {
  it("executes valid Python code and captures line traces and locals", async () => {
    const pyCode = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(3)
print("Factorial(3) =", result)
    `;

    const res = await runPythonTrace(pyCode, 100);
    expect(res.success).toBe(true);
    expect(res.stdout).toContain("Factorial(3) = 6");
    expect(res.steps.length).toBeGreaterThan(5);

    // Verify locals at base case
    const baseCaseStep = res.steps.find((s) => s.code.includes("return 1"));
    expect(baseCaseStep !== undefined).toBe(true);
    expect(baseCaseStep?.locals.n).toBe("1");
  });

  it("blocks dangerous Python imports and builtins via AST inspection", async () => {
    const maliciousCode = `
import os
print(os.listdir("."))
    `;

    const res = await runPythonTrace(maliciousCode);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Security Violation");
  });

  it("terminates infinite Python loops cleanly before memory bloat", async () => {
    const infiniteLoop = `
count = 0
while True:
    count += 1
    `;

    const res = await runPythonTrace(infiniteLoop, 50);
    expect(res.success).toBe(false);
    expect(res.timedOut).toBe(true);
    expect(res.error).toContain("Step limit exceeded");
  });

  it("executes valid code and captures return value and stdout", async () => {
    const code = `
      function fact(n) {
        if (n <= 1) return 1;
        return n * fact(n - 1);
      }
      console.log("Computing fact(4)");
      fact(4);
    `;

    const res = await runSandboxedJS(code, 2000);
    expect(res.success).toBe(true);
    expect(res.returnValue).toBe(24);
    expect(res.output).toContain("Computing fact(4)");
    expect(res.timedOut).toBe(false);
  });

  it("terminates infinite loops cleanly when execution exceeds timeout", async () => {
    const infiniteLoopCode = `
      let x = 0;
      while (true) {
        x++;
      }
    `;

    // Strict 200ms timeout
    const startTime = Date.now();
    const res = await runSandboxedJS(infiniteLoopCode, 200);
    const duration = Date.now() - startTime;

    expect(res.success).toBe(false);
    expect(res.timedOut).toBe(true);
    expect(duration).toBeLessThan(1000); // Must not hang
  });

  it("prevents access to host environment (process, require, fs)", async () => {
    // Attempt to access process
    const processTest = await runSandboxedJS("typeof process");
    expect(processTest.returnValue).toBe("undefined");

    // Attempt to access require
    const requireTest = await runSandboxedJS("typeof require");
    expect(requireTest.returnValue).toBe("undefined");

    // Attempt to access fs
    const fsTest = await runSandboxedJS("typeof fs");
    expect(fsTest.returnValue).toBe("undefined");
  });

  it("prevents browser environment access on server (window, document, localStorage, fetch)", async () => {
    const tests = [
      "typeof window",
      "typeof document",
      "typeof localStorage",
      "typeof fetch",
      "typeof XMLHttpRequest",
    ];

    for (const testCode of tests) {
      const res = await runSandboxedJS(testCode);
      expect(res.returnValue).toBe("undefined");
    }
  });
});
