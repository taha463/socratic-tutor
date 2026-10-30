import { NextRequest, NextResponse } from "next/server";
import { LearnerStore } from "@/core/learner";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const store = new LearnerStore();

    const turns = store.getTurns(sessionId);
    const signals = store.getSignals(sessionId);

    return NextResponse.json({
      sessionId,
      turns,
      signals,
    });
  } catch (error: any) {
    console.error("[api/session/[id]] Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session", message: error?.message },
      { status: 500 }
    );
  }
}
