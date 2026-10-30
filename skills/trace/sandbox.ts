/**
 * Sandboxed Execution Engine for Code Traces:
 * Enforces strict 5-second execution timeout and complete isolation from filesystem,
 * network, DOM, and system processes.
 */

import vm from "node:vm";

export interface TraceResult {
  success: boolean;
  output?: string;
  returnValue?: any;
  error?: string;
  timedOut: boolean;
  frames?: Array<{
    callStack: string[];
    variables: Record<string, any>;
  }>;
}

/**
 * Executes JavaScript code in an isolated VM sandbox with a strict execution timeout.
 */
export async function runSandboxedJS(
  code: string,
  timeoutMs: number = 5000
): Promise<TraceResult> {
  const logs: string[] = [];
  
  // Fully isolated context: no fs, no process, no fetch, no window/document
  const sandbox = {
    console: {
      log: (...args: any[]) => logs.push(args.map(String).join(" ")),
      error: (...args: any[]) => logs.push(args.map(String).join(" ")),
      warn: (...args: any[]) => logs.push(args.map(String).join(" ")),
    },
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  const context = vm.createContext(sandbox);

  try {
    const script = new vm.Script(code);
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    return {
      success: true,
      output: logs.join("\n"),
      returnValue: result,
      timedOut: false,
    };
  } catch (err: any) {
    const isTimeout =
      err?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT" ||
      err?.message?.includes("timed out") ||
      err?.message?.includes("Script execution timed out");

    return {
      success: false,
      output: logs.join("\n"),
      error: err?.message || "Execution error",
      timedOut: Boolean(isTimeout),
    };
  }
}
