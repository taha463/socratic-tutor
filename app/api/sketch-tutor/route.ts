import { NextRequest, NextResponse } from "next/server";
import { sketchService } from "@/backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conceptQuery = body.concept_query || body.concept || "Recursion";
    const board = await sketchService.generateSketchboard(conceptQuery);
    return NextResponse.json(board);
  } catch (error: any) {
    console.error("[api/sketch-tutor] Error:", error);
    return NextResponse.json(sketchService.generateFallbackBoard("Core Mental Model"));
  }
}
