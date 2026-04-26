"use client";

import { Building2, Search } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  // live meeting status
  running: boolean;
  chairmanId: string | null;
  searchingAgents: Set<string>;
  activeAgentIds: Set<string>;
  phase1DoneCount: Set<string>;
  currentPhase: number;
  agentTokens: Record<string, { totalTokens: number }>;
}

export default function AgentSetupPanel({
  agents, selectedIds, onToggle, onSelectAll, onDeselectAll,
  running, chairmanId, searchingAgents, activeAgentIds,
  phase1DoneCount, currentPhase,
}: Props) {
  return (
    <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
          สมาชิกที่ประชุม ({selectedIds.size}/{agents.length})
        </div>
        {agents.length > 0 && (
          <button
            onClick={() => {
              if (selectedIds.size === agents.length) onDeselectAll();
              else onSelectAll();
            }}
            className="text-[11px] px-2 py-0.5 rounded border transition-all"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {selectedIds.size === agents.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </button>
        )}
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-6 px-3">
          <Building2 size={28} className="mx-auto mb-2" style={{ color: "var(--accent)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มี agent — สร้างทีมก่อนเพื่อเริ่มประชุม</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {agents.map((agent) => {
            const isChairman = agent.id === chairmanId;
            const isSearching = searchingAgents.has(agent.id);
            const isSpeaking = activeAgentIds.has(agent.id);
            const isSelected = selectedIds.has(agent.id);
            const hasDonePhase1 = phase1DoneCount.has(agent.id);
            const isActive = running && isSelected;

            let statusText: React.ReactNode = agent.role;
            if (isSpeaking) {
              statusText = <span style={{ color: "var(--accent)" }}>▶ กำลังพูด...</span>;
            } else if (isActive && hasDonePhase1) {
              statusText = <span style={{ color: "var(--green, #4ade80)" }}>✓ รายงานแล้ว</span>;
            } else if (isActive && !isSpeaking && currentPhase === 1) {
              statusText = <span style={{ color: "var(--text-muted)" }}>○ รอคิว</span>;
            }

            return (
              <button
                key={agent.id}
                onClick={() => onToggle(agent.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${isSpeaking ? "ring-1 ring-[var(--accent)]" : ""}`}
                style={{
                  borderColor: isSpeaking ? "var(--accent)" : isSelected ? "var(--accent)" : "var(--border)",
                  background: isSpeaking ? "var(--accent-15)" : isSelected ? "var(--accent-8)" : "transparent",
                  minHeight: 44,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base flex-shrink-0">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{agent.name}</div>
                      {isChairman && (
                        <span className="text-[10px] px-1 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "#000" }}>ประธาน</span>
                      )}
                      {agent.useWebSearch && (
                        <span title="Web Search"><Search size={10} style={{ color: "var(--text-muted)" }} /></span>
                      )}
                      {!agent.hasApiKey && (
                        <span className="text-[10px] px-1 rounded" style={{ background: "var(--danger-10)", color: "var(--danger)" }}>ไม่มี Key</span>
                      )}
                    </div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {statusText}
                    </div>
                    <div className="text-[10px] mt-0.5 opacity-60" style={{ color: "var(--text-muted)" }}>
                      {agent.model}
                    </div>
                  </div>
                  {isSearching ? (
                    <span className="text-[10px] animate-pulse flex-shrink-0" style={{ color: "var(--accent)" }}>ค้นหา...</span>
                  ) : isSpeaking ? (
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--accent)" }} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isSelected ? "var(--accent)" : "var(--border)" }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
