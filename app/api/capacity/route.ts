import { NextResponse } from "next/server";
import { getLLMGateway } from "@/core/llm/gateway";

export async function GET() {
  try {
    const gateway = getLLMGateway();
    const status = gateway.getStatus();
    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to retrieve capacity status" },
      { status: 500 }
    );
  }
}

