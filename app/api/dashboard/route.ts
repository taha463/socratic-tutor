import { NextRequest, NextResponse } from "next/server";
import { dashboardService } from "@/backend";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const learnerId = searchParams.get("learnerId") || "default-learner";

    const metrics = dashboardService.getMetrics(learnerId);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("[api/dashboard] Error generating dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard data", message: error?.message },
      { status: 500 }
    );
  }
}
