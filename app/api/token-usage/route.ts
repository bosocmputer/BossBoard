import { NextResponse } from "next/server";
import { getAgentStats, listAgents, listResearch } from "@/lib/agents-store";

export async function GET() {
  try {
    const stats = getAgentStats();
    const agents = listAgents();
    const sessions = listResearch();

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    // Per-agent breakdown
    const agentBreakdown = Object.values(stats)
      .map((s) => {
        const agent = agentMap.get(s.agentId);
        return {
          agentId: s.agentId,
          agentName: agent?.name || "Unknown",
          agentEmoji: agent?.emoji || "🤖",
          model: agent?.model || "",
          totalSessions: s.totalSessions,
          inputTokens: s.totalInputTokens,
          outputTokens: s.totalOutputTokens,
          totalTokens: s.totalInputTokens + s.totalOutputTokens,
          lastUsed: s.lastUsed,
          daily: s.daily,
        };
      })
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // Daily aggregation (last 30 days)
    const dailyMap: Record<string, { date: string; input: number; output: number; sessions: number }> = {};
    for (const s of Object.values(stats)) {
      for (const d of s.daily) {
        if (!dailyMap[d.date]) {
          dailyMap[d.date] = { date: d.date, input: 0, output: 0, sessions: 0 };
        }
        dailyMap[d.date].input += d.inputTokens;
        dailyMap[d.date].output += d.outputTokens;
        dailyMap[d.date].sessions += d.sessions;
      }
    }
    const dailyUsage = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Recent sessions with token info
    const recentSessions = sessions
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        question: s.question,
        status: s.status,
        startedAt: s.startedAt,
        totalTokens: s.totalTokens,
        messageCount: s.messages.length,
        agentCount: new Set(s.messages.map((m) => m.agentId)).size,
      }));

    // Totals
    const totalInput = agentBreakdown.reduce((s, a) => s + a.inputTokens, 0);
    const totalOutput = agentBreakdown.reduce((s, a) => s + a.outputTokens, 0);

    return NextResponse.json({
      totalInput,
      totalOutput,
      totalTokens: totalInput + totalOutput,
      totalSessions: sessions.length,
      agentBreakdown,
      dailyUsage,
      recentSessions,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
