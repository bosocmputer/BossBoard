"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Card from "../components/Card";
import { Skeleton, SkeletonCard } from "../components/Skeleton";

interface AgentBreakdown {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  model: string;
  totalSessions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastUsed: string;
}

interface DailyUsage {
  date: string;
  input: number;
  output: number;
  sessions: number;
}

interface SessionInfo {
  id: string;
  question: string;
  status: string;
  startedAt: string;
  totalTokens: number;
  messageCount: number;
  agentCount: number;
}

interface TokenData {
  totalInput: number;
  totalOutput: number;
  totalTokens: number;
  totalSessions: number;
  agentBreakdown: AgentBreakdown[];
  dailyUsage: DailyUsage[];
  recentSessions: SessionInfo[];
}

export default function TokensPage() {
  const { t } = useI18n();
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    fetch("/api/token-usage")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชม.ที่แล้ว`;
    const days = Math.floor(hours / 24);
    return `${days} วันที่แล้ว`;
  };

  const maxDaily = data ? Math.max(...data.dailyUsage.map((d) => d.input + d.output), 1) : 1;

  const visibleAgents = data
    ? showAllAgents
      ? data.agentBreakdown
      : data.agentBreakdown.slice(0, 5)
    : [];

  const visibleSessions = data
    ? showAllSessions
      ? data.recentSessions
      : data.recentSessions.slice(0, 8)
    : [];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
          📊 Token Usage
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          รายละเอียดการใช้งาน Token ทั้งหมด
        </p>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            { label: "Total Tokens", value: fmt(data.totalTokens), sub: "input + output", icon: TrendingUp, color: "var(--success)" },
            { label: "Input Tokens", value: fmt(data.totalInput), sub: "prompt tokens", icon: ArrowUpRight, color: "var(--accent)" },
            { label: "Output Tokens", value: fmt(data.totalOutput), sub: "completion tokens", icon: ArrowDownLeft, color: "var(--info)" },
            { label: "Sessions", value: data.totalSessions.toLocaleString(), sub: "total sessions", icon: MessageSquare, color: "var(--purple)" },
          ].map((stat) => (
            <Card key={stat.label} padding="md">
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
          ))}
        </div>
      ) : null}

      {/* Daily usage chart */}
      {loading ? (
        <div className="mb-8">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : data && data.dailyUsage.length > 0 ? (
        <Card padding="md" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              การใช้งานรายวัน (30 วันล่าสุด)
            </h2>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--accent)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--info)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Output</span>
            </div>
          </div>
          {/* Chart */}
          <div className="flex items-end gap-[2px] h-40 md:h-48">
            {data.dailyUsage.map((day) => {
              const inputH = (day.input / maxDaily) * 100;
              const outputH = (day.output / maxDaily) * 100;
              const total = day.input + day.output;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0 group relative min-w-0">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div
                      className="px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap shadow-lg"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <div className="font-medium mb-0.5">{day.date}</div>
                      <div style={{ color: "var(--accent)" }}>In: {fmt(day.input)}</div>
                      <div style={{ color: "var(--info)" }}>Out: {fmt(day.output)}</div>
                      <div style={{ color: "var(--text-muted)" }}>Total: {fmt(total)}</div>
                    </div>
                  </div>
                  {/* Stacked bars */}
                  <div className="w-full flex flex-col items-stretch justify-end" style={{ height: "100%" }}>
                    <div className="flex flex-col justify-end flex-1">
                      <div
                        className="rounded-t-sm transition-all duration-200 group-hover:opacity-80"
                        style={{ height: `${outputH}%`, background: "var(--info)", minHeight: total > 0 ? 2 : 0 }}
                      />
                      <div
                        className="rounded-b-sm transition-all duration-200 group-hover:opacity-80"
                        style={{ height: `${inputH}%`, background: "var(--accent)", minHeight: total > 0 ? 2 : 0 }}
                      />
                    </div>
                  </div>
                  {/* Date label - show every few days */}
                  <span
                    className="text-[8px] md:text-[9px] mt-1 rotate-0"
                    style={{ color: "var(--text-muted)", opacity: data.dailyUsage.indexOf(day) % Math.ceil(data.dailyUsage.length / 10) === 0 ? 1 : 0 }}
                  >
                    {fmtDate(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Agent breakdown */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Users size={16} style={{ color: "var(--text-muted)" }} />
              Token ตามเอเจนต์
            </h2>
            {data && data.agentBreakdown.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {data.agentBreakdown.length} เอเจนต์
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : data && data.agentBreakdown.length > 0 ? (
            <>
              <div className="space-y-2">
                {visibleAgents.map((agent) => {
                  const pct = data.totalTokens > 0 ? (agent.totalTokens / data.totalTokens) * 100 : 0;
                  return (
                    <div key={agent.agentId} className="px-3 py-3 rounded-xl transition-colors hover:bg-[var(--surface)]">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{agent.agentEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.agentName}</p>
                            <p className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>{fmt(agent.totalTokens)}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {agent.model ? agent.model.split("/").pop() : "—"}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {agent.totalSessions} sessions
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                            <div className="h-full rounded-full flex">
                              <div
                                className="h-full"
                                style={{
                                  width: `${data.totalTokens > 0 ? (agent.inputTokens / data.totalTokens) * 100 : 0}%`,
                                  background: "var(--accent)",
                                }}
                              />
                              <div
                                className="h-full"
                                style={{
                                  width: `${data.totalTokens > 0 ? (agent.outputTokens / data.totalTokens) * 100 : 0}%`,
                                  background: "var(--info)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                              ↑ {fmt(agent.inputTokens)}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--info)" }}>
                              ↓ {fmt(agent.outputTokens)}
                            </span>
                            <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.agentBreakdown.length > 5 && (
                <button
                  onClick={() => setShowAllAgents(!showAllAgents)}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors hover:bg-[var(--surface)]"
                  style={{ color: "var(--accent)" }}
                >
                  {showAllAgents ? (
                    <>แสดงน้อยลง <ChevronUp size={14} /></>
                  ) : (
                    <>ดูทั้งหมด ({data.agentBreakdown.length}) <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล Token</p>
            </div>
          )}
        </Card>

        {/* Recent sessions */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Clock size={16} style={{ color: "var(--text-muted)" }} />
              Token ตาม Session
            </h2>
            <Link href="/research" className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>
              ดูการประชุม →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : data && data.recentSessions.length > 0 ? (
            <>
              <div className="space-y-1.5">
                {visibleSessions.map((s) => (
                  <div key={s.id} className="px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--surface)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate flex-1" style={{ color: "var(--text)" }}>
                        {s.question}
                      </p>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>
                        {fmt(s.totalTokens)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(s.startedAt)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {s.messageCount} ข้อความ
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {s.agentCount} เอเจนต์
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
                        style={{
                          background: s.status === "running" ? "var(--success)" + "20" : "var(--surface)",
                          color: s.status === "running" ? "var(--success)" : "var(--text-muted)",
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {data.recentSessions.length > 8 && (
                <button
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors hover:bg-[var(--surface)]"
                  style={{ color: "var(--accent)" }}
                >
                  {showAllSessions ? (
                    <>แสดงน้อยลง <ChevronUp size={14} /></>
                  ) : (
                    <>ดูทั้งหมด ({data.recentSessions.length}) <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มี Session</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
