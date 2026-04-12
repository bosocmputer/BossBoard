import { NextRequest, NextResponse } from "next/server";
import { updateAgent, deleteAgent } from "@/lib/agents-store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateAgent(id, body);
    if (!updated) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ agent: updated });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await deleteAgent(id);
    if (!ok) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}
