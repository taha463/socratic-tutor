import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { turnService } from "@/backend";

const TurnRequestSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  learnerId: z.string().default("default-learner"),
  message: z.string().min(1, "message cannot be empty"),
  topic: z.string().default("general"),
  signals: z.record(z.any()).optional().default({}),
  groundTruth: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validation = TurnRequestSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, learnerId, message, topic, signals, groundTruth } = validation.data;

    const response = await turnService.executeTurn({
      sessionId,
      learnerId,
      message,
      topic,
      signals,
      groundTruth,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[api/turn] Error handling turn:", error);
    return NextResponse.json(
      { error: "Internal tutor error", message: error?.message || "Failed to process turn." },
      { status: 500 }
    );
  }
}
