import { NextRequest, NextResponse } from "next/server";
import { getMemoryFacts, upsertMemoryFact, deleteMemoryFact } from "@/lib/agents-store";

export async function GET() {
  return NextResponse.json({ facts: getMemoryFacts() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value, source } = body;
  if (!key || typeof key !== "string" || key.length > 100) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  if (!value || typeof value !== "string" || value.length > 500) {
    return NextResponse.json({ error: "Invalid value (max 500 chars)" }, { status: 400 });
  }
  const fact = upsertMemoryFact(key, value, source || "manual");
  return NextResponse.json({ fact }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = deleteMemoryFact(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
