import { NextResponse } from "next/server";
import { listResearch } from "@/lib/agents-store";

export async function GET() {
  try {
    const sessions = await listResearch();
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
