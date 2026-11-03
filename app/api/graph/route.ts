import { NextRequest, NextResponse } from "next/server";
import { getSocraticGraphMermaid, SocraticGraphCheckpointer } from "@/core/graph";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    const checkpointer = new SocraticGraphCheckpointer();
    const mermaid = getSocraticGraphMermaid();

    if (threadId) {
      const checkpoints = checkpointer.listCheckpoints(threadId);
      return NextResponse.json({
        threadId,
        checkpointsCount: checkpoints.length,
        checkpoints,
        mermaid,
      });
    }

    return NextResponse.json({
      architecture: "LangGraph StateGraph",
      version: "1.6.0",
      nodes: ["diagnostician", "teacher", "critic", "visualizer"],
      cyclicEdges: ["critic -> teacher (rewrite loop, max 2)"],
      mermaid,
    });
  } catch (error: any) {
    console.error("[api/graph] Error fetching graph metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch graph data", message: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceThreadId, sourceCheckpointId, newThreadId } = body;

    if (!sourceThreadId || !sourceCheckpointId || !newThreadId) {
      return NextResponse.json(
        { error: "sourceThreadId, sourceCheckpointId, and newThreadId are required" },
        { status: 400 }
      );
    }

    const checkpointer = new SocraticGraphCheckpointer();
    const forkedCheckpoint = checkpointer.forkThread(sourceThreadId, sourceCheckpointId, newThreadId);

    return NextResponse.json({
      message: "Thread successfully forked to alternate branch",
      forkedCheckpoint,
    });
  } catch (error: any) {
    console.error("[api/graph/fork] Error forking thread:", error);
    return NextResponse.json(
      { error: "Failed to fork thread", message: error?.message },
      { status: 500 }
    );
  }
}

