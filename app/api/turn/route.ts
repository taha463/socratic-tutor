import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { turnService } from "@/backend";
import { isCapacityError } from "@/core/llm/gateway";

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
    if (isCapacityError(error) || error?.code === "LLM_CAPACITY" || error?.name === "LLMCapacityError" || error?.retryAfterSeconds) {
      const retryAt = error.retryAt ? new Date(error.retryAt).toISOString() : new Date(Date.now() + 60_000).toISOString();
      const retryAfterSeconds = error.retryAfterSeconds ?? Math.max(1, Math.ceil((new Date(retryAt).getTime() - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          limited: true,
          message: error.message || "Model limit reached across configured providers.",
          retryAt,
          retryAfterSeconds,
          attempts: error.attempts || [],
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    console.error("[api/turn] Error handling turn:", error);
    return NextResponse.json(
      { error: "Internal tutor error", message: error?.message || "Failed to process turn." },
      { status: 500 }
    );
  }
}
