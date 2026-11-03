import { NextRequest, NextResponse } from "next/server";
import { certificateService } from "@/backend/index";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, topic } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 }
      );
    }

    const cert = certificateService.generateCertificate(sessionId, "default-learner", topic);
    return NextResponse.json(cert);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate certificate." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId parameter is required." },
        { status: 400 }
      );
    }

    const cert = certificateService.generateCertificate(sessionId);
    return NextResponse.json(cert);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve certificate." },
      { status: 500 }
    );
  }
}

