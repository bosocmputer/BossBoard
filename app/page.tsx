"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  Users,
  UsersRound,
  MessageSquare,
  Zap,
  ArrowRight,
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react";
import Card from "./components/Card";
import { Skeleton, SkeletonCard } from "./components/Skeleton";

interface DashboardData {
  totalAgents: number;
  activeAgents: number;
  totalTeams: number;
  totalSessions: number;
  runningSessions: number;
  totalTokens: number;
  recentSessions: { id: string; question: string; status: string; startedAt: string; totalTokens: number }[];
  topAgents: { name: string; emoji: string; sessions: number }[];
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [agentsRes, teamsRes, sessionsRes, statsRes] = await Promise.all([
          fetch("/api/team-agents"),
          fetch("/api/teams"),
          fetch("/api/team-research"),
          fetch("/api/agent-stats"),
        ]);

        const [agentsData, teamsData, sessionsData, statsData] = await Promise.all([
          agentsRes.json(),
          teamsRes.json(),
          sessionsRes.json(),
          statsRes.json(),
        ]);

        const agents = agentsData.agents || [];
        const teams = teamsData.teams || [];
        const sessions = sessionsData.sessions || [];
        const stats: Record<string, {
          agentId: string;
          totalSessions: number;
          totalInputTokens: number;
          totalOutputTokens: number;
        }> = statsData || {};

        const totalTokens = Object.values(stats).reduce(
          (sum, s) => sum + (s.totalInputTokens || 0) + (s.totalOutputTokens || 0),
          0
        );

        const agentMap = new Map(agents.map((a: { id: string; name: string; emoji: string }) => [a.id, a]));
        const topAgents = Object.values(stats)
          .sort((a, b) => b.totalSessions - a.totalSessions)
          .slice(0, 5)
          .map((s) => {
            const agent = agentMap.get(s.agentId) as { name: string; emoji: string } | undefined;
            return {
              name: agent?.name || "Unknown",
              emoji: agent?.emoji || "🤖",
              sessions: s.totalSessions,
            };
          });

        setData({
          totalAgents: agents.length,
          activeAgents: agents.filter((a: { active: boolean }) => a.active).length,
          totalTeams: teams.length,
          totalSessions: sessions.length,
          runningSessions: sessions.filter((s: { status: string }) => s.status === "running").length,
          totalTokens,
          recentSessions: sessions.slice(0, 5).map((s: { id: string; question: string; status: string; startedAt: string; totalTokens: number }) => ({
            id: s.id,
            question: s.question,
            status: s.status,
            startedAt: s.startedAt,
            totalTokens: s.totalTokens,
          })),
          topAgents,
        });
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statCards = data
    ? [
        { label: "Agents", value: data.totalAgents, sub: `${data.activeAgents} active`, icon: Users, color: "var(--accent)" },
        { label: "Teams", value: data.totalTeams, sub: "configured", icon: Zap, color: "var(--info)" },
        { label: "Sessions", value: data.totalSessions, sub: data.runningSessions > 0 ? `${data.runningSessions} running` : "total", icon: MessageSquare, color: "var(--purple)" },
        { label: "Tokens", value: formatTokens(data.totalTokens), sub: "total used", icon: TrendingUp, color: "var(--success)", href: "/tokens" },
      ]
    : [];

  const quickActions = [
    { href: "/research", icon: MessageSquare, label: t("nav.research"), desc: "เริ่มการประชุม AI", color: "var(--accent)" },
    { href: "/agents", icon: Users, label: t("nav.teamAgents"), desc: "จัดการเอเจนต์", color: "var(--info)" },
    { href: "/teams", icon: UsersRound, label: t("nav.teams"), desc: "จัดการทีม", color: "var(--purple)" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto animate-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
          {t("nav.dashboard")} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          ภาพรวมของระบบ BossBoard
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {statCards.map((stat) => {
            const inner = (
              <Card key={stat.label} padding="md" hover={!!stat.href}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>{stat.value}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.color + "18" }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
              </Card>
            );
            return stat.href ? <Link key={stat.label} href={stat.href}>{inner}</Link> : <div key={stat.label}>{inner}</div>;
          })}
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card hover padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.color + "18" }}>
                    <action.icon size={20} style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{action.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{action.desc}</p>
                  </div>
                  <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom section: recent sessions + top agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent sessions */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Clock size={16} style={{ color: "var(--text-muted)" }} />
              การประชุมล่าสุด
            </h3>
            <Link href="/research" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              ดูทั้งหมด
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : data && data.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {data.recentSessions.map((s) => (
                <Link key={s.id} href="/research" className="block">
                  <div
                    className="px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--surface)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate flex-1" style={{ color: "var(--text)" }}>
                        {s.question}
                      </p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: s.status === "running" ? "var(--success)" + "20" : "var(--surface)",
                          color: s.status === "running" ? "var(--success)" : "var(--text-muted)",
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(s.startedAt)}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {formatTokens(s.totalTokens)} tokens
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีการประชุม</p>
            </div>
          )}
        </Card>

        {/* Top agents */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Activity size={16} style={{ color: "var(--text-muted)" }} />
              เอเจนต์ยอดนิยม
            </h3>
            <Link href="/agents" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              ดูทั้งหมด
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : data && data.topAgents.length > 0 ? (
            <div className="space-y-2">
              {data.topAgents.map((agent, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{agent.sessions} sessions</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)" + "18", color: "var(--accent)" }}>
                    #{i + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูลเอเจนต์</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
