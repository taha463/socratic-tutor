import { NextRequest, NextResponse } from "next/server";
import { sessionService } from "@/backend";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic") || "General";
    const learnerId = searchParams.get("learnerId") || "default-learner";

    const sessionDetail = sessionService.getSession(sessionId, topic, learnerId);

    return NextResponse.json(sessionDetail);
  } catch (error: any) {
    console.error("[api/session/[id]] Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session", message: error?.message },
      { status: 500 }
    );
  }
}
