"use client";

import { X } from "lucide-react";
import type { Agent } from "../types";
import AgentSetupPanel from "./AgentSetupPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function AgentTeamModal({
  open, onClose, agents, selectedIds, onToggle, onSelectAll, onDeselectAll,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="ปิด"
      />
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
            ปรับทีมที่ปรึกษา
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AgentSetupPanel
            agents={agents}
            selectedIds={selectedIds}
            onToggle={onToggle}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            running={false}
            chairmanId={null}
            searchingAgents={new Set()}
            activeAgentIds={new Set()}
            phase1DoneCount={new Set()}
            currentPhase={0}
            agentTokens={{}}
          />
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg font-bold"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
