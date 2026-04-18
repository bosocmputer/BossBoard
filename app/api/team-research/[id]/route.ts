import { NextResponse } from "next/server";
import { getResearchSession, completeResearchSession } from "@/lib/agents-store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getResearchSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.action !== "force-complete") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const session = getResearchSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status !== "running") {
      return NextResponse.json({ error: "Session is not running" }, { status: 409 });
    }
    const reason = typeof body.reason === "string" ? body.reason : "🔒 ปิดประชุมโดยผู้ใช้";
    completeResearchSession(id, reason, "completed");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
