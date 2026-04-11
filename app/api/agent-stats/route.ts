import { NextResponse } from "next/server";
import { getAgentStats } from "@/lib/agents-store";

export async function GET() {
  const stats = getAgentStats();
  return NextResponse.json(stats);
}
