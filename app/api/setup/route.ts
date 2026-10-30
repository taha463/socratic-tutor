import { NextRequest, NextResponse } from "next/server";
import { getLLMClient } from "@/core/llm";

export async function GET() {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  const hasKey = Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    provider === "ollama" ||
    provider === "mock"
  );

  return NextResponse.json({
    provider,
    hasKey,
    supportedProviders: ["anthropic", "openai", "gemini", "ollama", "mock"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { provider } = await req.json();
    const client = getLLMClient(provider);
    const testResult = await client.complete([
      { role: "user", content: "Reply with 'OK' if you can read this." },
    ]);

    return NextResponse.json({
      success: true,
      provider: client.name,
      response: testResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to connect to provider" },
      { status: 500 }
    );
  }
}
