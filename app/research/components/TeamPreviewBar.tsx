"use client";

import { Users, Settings } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  selectedIds: Set<string>;
  chairmanId: string | null;
  activeAgentIds: Set<string>;
  phase1DoneCount: Set<string>;
  running: boolean;
  onOpenTeamModal: () => void;
}

export default function TeamPreviewBar({
  agents, selectedIds, chairmanId, activeAgentIds, phase1DoneCount, running, onOpenTeamModal,
}: Props) {
  const selected = agents.filter(a => selectedIds.has(a.id));
  if (selected.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b overflow-x-auto"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <Users size={13} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
      <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>ทีม:</span>

      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
        {selected.map(agent => {
          const isActive = activeAgentIds.has(agent.id);
          const isDone = phase1DoneCount.has(agent.id);
          const isChairman = chairmanId === agent.id;

          let statusLabel = "";
          let statusColor = "var(--text-muted)";
          if (isActive) { statusLabel = "พูดอยู่"; statusColor = "var(--accent)"; }
          else if (isDone) { statusLabel = "เสร็จ"; statusColor = "var(--green, #4ade80)"; }
          else if (running) { statusLabel = "รอ"; statusColor = "var(--text-muted)"; }

          return (
            <div
              key={agent.id}
              className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 transition-all"
              style={{
                background: isActive ? "var(--accent-15)" : "transparent",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              }}
              title={`${agent.name}${isChairman ? " (ประธาน)" : ""}`}
            >
              <span className="text-sm leading-none">{agent.emoji}</span>
              <span className="text-[11px] truncate max-w-[80px]" style={{ color: "var(--text)" }}>
                {agent.name}
              </span>
              {isChairman && <span className="text-[9px]" style={{ color: "var(--accent)" }}>👑</span>}
              {statusLabel && (
                <span
                  className="text-[10px] flex items-center gap-0.5 flex-shrink-0"
                  style={{ color: statusColor }}
                >
                  {isActive && <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: statusColor }} />}
                  {statusLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenTeamModal}
        disabled={running}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80 flex-shrink-0 disabled:opacity-40"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        title={running ? "ปรับทีมไม่ได้ระหว่างประชุม" : "ปรับทีม"}
      >
        <Settings size={11} /> ปรับทีม
      </button>
    </div>
  );
}
