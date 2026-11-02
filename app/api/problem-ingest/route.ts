import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestProblemSpecification } from "@/core/problemIngest";

const IngestSchema = z.object({
  rawText: z.string().min(5, "Problem text must be at least 5 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = ingestProblemSpecification(parsed.data.rawText);
    return NextResponse.json({ ok: true, problem: result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}

