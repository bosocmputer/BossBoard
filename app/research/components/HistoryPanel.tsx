"use client";

import { History, Check, X, MessageSquare, Trash2, RefreshCw } from "lucide-react";
import type { ServerSession, ConversationRound } from "../types";

interface Props {
  serverSessions: ServerSession[];
  filteredSessions: ServerSession[];
  totalSessionCount: number;
  viewingSession: ServerSession | null;
  sessionSearch: string;
  sessionStatusFilter: "all" | "completed" | "error" | "running";
  onSessionSearch: (v: string) => void;
  onStatusFilter: (v: "all" | "completed" | "error" | "running") => void;
  onLoadSession: (s: ServerSession) => void;
  onCloseSession: () => void;
  onRefresh: () => void;
  rounds: ConversationRound[];
  onClearSession: () => void;
}

function groupByDate(sessions: ServerSession[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: ServerSession[] }[] = [];
  const seen = new Map<string, ServerSession[]>();

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    d.setHours(0, 0, 0, 0);
    let key: string;
    if (d.getTime() === today.getTime()) key = "วันนี้";
    else if (d.getTime() === yesterday.getTime()) key = "เมื่อวาน";
    else key = d.toLocaleDateString("th", { day: "numeric", month: "short", year: "numeric" });

    if (!seen.has(key)) { seen.set(key, []); groups.push({ label: key, items: seen.get(key)! }); }
    seen.get(key)!.push(s);
  }
  return groups;
}

export default function HistoryPanel({
  serverSessions, filteredSessions, totalSessionCount,
  viewingSession, sessionSearch, sessionStatusFilter,
  onSessionSearch, onStatusFilter, onLoadSession, onCloseSession, onRefresh,
  rounds, onClearSession,
}: Props) {
  const groups = sessionSearch || sessionStatusFilter !== "all" ? null : groupByDate(filteredSessions);

  return (
    <div className="border rounded-xl flex-1 flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="px-3 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <History size={12} /> ประวัติการประชุม ({totalSessionCount})
          </div>
          <button onClick={onRefresh} className="p-1 rounded hover:opacity-70" title="รีเฟรช">
            <RefreshCw size={12} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <input
          type="text"
          value={sessionSearch}
          onChange={(e) => onSessionSearch(e.target.value)}
          placeholder="ค้นหาประวัติ..."
          className="w-full text-xs px-2 py-1.5 rounded-lg border outline-none"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
        />
      </div>

      <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
        {/* Current rounds summary */}
        {rounds.length > 0 && (
          <div className="border rounded-lg p-2" style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)" }}>
            <div className="text-[11px] font-bold mb-1" style={{ color: "var(--accent)" }}>
              🔵 เซสชันปัจจุบัน — {rounds.filter(r => !r.isSynthesis).length} วาระ
            </div>
            {rounds.map((r, i) => (
              <div key={i} className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                {i + 1}. {r.question}
              </div>
            ))}
            <button
              onClick={onClearSession}
              className="mt-2 w-full text-[11px] py-1 rounded border flex items-center justify-center gap-1"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <Trash2 size={10} /> เริ่มการประชุมใหม่
            </button>
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>ไม่พบประวัติ</div>
        ) : groups ? (
          groups.map((g) => (
            <div key={g.label}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: "var(--text-muted)" }}>
                ● {g.label}
              </div>
              <div className="space-y-1.5">
                {g.items.map((s) => <SessionCard key={s.id} session={s} active={viewingSession?.id === s.id} onLoad={onLoadSession} />)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {totalSessionCount > 20 && sessionSearch === "" && sessionStatusFilter === "all" && (
              <div className="text-[11px] text-center py-1 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--accent-8)" }}>
                แสดง 20 ล่าสุด จาก {totalSessionCount} รายการ
              </div>
            )}
            {filteredSessions.map((s) => <SessionCard key={s.id} session={s} active={viewingSession?.id === s.id} onLoad={onLoadSession} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session: s, active, onLoad }: { session: ServerSession; active: boolean; onLoad: (s: ServerSession) => void }) {
  const isRunning = s.status !== "completed" && s.status !== "error";
  const isStale = isRunning && Date.now() - new Date(s.startedAt).getTime() > 30 * 60 * 1000;

  // Extract unique agents from messages
  const agentPreviews: { emoji: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const m of s.messages ?? []) {
    if (m.agentId && !seen.has(m.agentId) && m.agentEmoji) {
      seen.add(m.agentId);
      agentPreviews.push({ emoji: m.agentEmoji, name: m.agentName });
    }
    if (agentPreviews.length >= 5) break;
  }

  let statusIcon: React.ReactNode;
  if (s.status === "completed") statusIcon = <Check size={10} className="text-green-500" />;
  else if (s.status === "error") statusIcon = <X size={10} className="text-red-500" />;
  else if (isStale) statusIcon = <span className="text-[10px] text-amber-500">⚠️</span>;
  else statusIcon = <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />;

  return (
    <button
      onClick={() => onLoad(s)}
      className="w-full text-left p-2.5 rounded-lg border transition-all"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent-8)" : "transparent",
      }}
    >
      {/* Agent previews */}
      {agentPreviews.length > 0 && (
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          {agentPreviews.map((a, i) => (
            <span key={i} className="text-sm leading-none" title={a.name}>{a.emoji}</span>
          ))}
          <span className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--text-muted)" }}>
            {agentPreviews.map(a => a.name).join(" · ")}
          </span>
          {active && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: "var(--accent-15)", color: "var(--accent)" }}>
              👁 ดูอยู่
            </span>
          )}
        </div>
      )}

      <div className="text-xs line-clamp-2" style={{ color: "var(--text)" }}>{s.question}</div>
      <div className="text-[11px] mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-muted)" }}>
        {statusIcon}
        <span>{new Date(s.startedAt).toLocaleDateString("th")}</span>
        {s.totalTokens > 0 && <span>· {s.totalTokens.toLocaleString()} tk</span>}
        {s.ownerUsername && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>@{s.ownerUsername}</span>
        )}
        {isRunning && !isStale && <span className="text-[10px]" style={{ color: "#3b82f6" }}><MessageSquare size={9} className="inline" /> กำลังประชุม</span>}
      </div>
    </button>
  );
}
