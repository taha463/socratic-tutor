import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateVivaVoceScenario, evaluateVivaVoceExplanation } from "@/core/vivaVoce";

const EvaluateSchema = z.object({
  scenario: z.object({
    id: z.string(),
    topic: z.string(),
    peerName: z.string(),
    peerRole: z.string(),
    flawedClaim: z.string(),
    underlyingFlaw: z.string(),
    keyPointsToAddress: z.array(z.string()),
  }),
  explanation: z.string().min(1, "Explanation cannot be empty"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic") || "Recursion";
    const scenario = generateVivaVoceScenario(topic);
    return NextResponse.json({ ok: true, scenario });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
    }

    const { scenario, explanation } = parsed.data;
    const evaluation = evaluateVivaVoceExplanation(scenario, explanation);
    return NextResponse.json({ ok: true, evaluation });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}

