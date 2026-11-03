import { NextRequest, NextResponse } from "next/server";
import { runPythonTrace } from "@/skills/trace/pythonSandbox";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, maxSteps = 300 } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "Code cannot be empty.", steps: [], stdout: "", totalSteps: 0, timedOut: false },
        { status: 400 }
      );
    }

    const result = await runPythonTrace(code, maxSteps);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Sandbox internal error: ${err?.message || "Execution failed"}`,
        steps: [],
        stdout: "",
        totalSteps: 0,
        timedOut: false,
      },
      { status: 500 }
    );
  }
}

