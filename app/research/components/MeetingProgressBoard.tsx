"use client";

import { SkipForward, Square } from "lucide-react";

interface Props {
  running: boolean;
  status: string;
  currentPhase: number;
  phase1DoneCount: number;
  totalAgents: number;
  elapsedTime: number;
  isSynthesizing: boolean;
  effectiveMode: "meeting" | "qa";
  onSkipToSummary: () => void;
  onStop: () => void;
}

const PHASES = [
  { phase: 1, label: "รับฟังความเห็น", icon: "📋" },
  { phase: 2, label: "ถกเถียงแลกเปลี่ยน", icon: "💬" },
  { phase: 3, label: "ประธานสรุปมติ", icon: "🏛️" },
] as const;

function elapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MeetingProgressBoard({
  running, status, currentPhase, phase1DoneCount, totalAgents,
  elapsedTime, isSynthesizing, effectiveMode,
  onSkipToSummary, onStop,
}: Props) {
  if (!running || effectiveMode === "qa") return null;

  return (
    <div className="sticky top-0 z-10 mx-1">
      <div className="rounded-xl border px-3 py-2.5" style={{ background: "var(--surface)", borderColor: running ? "var(--accent-30)" : "var(--border)" }}>
        {/* Top row: status + timer + controls */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--accent)" }} />
          <span className="text-xs flex-1 min-w-0 truncate" style={{ color: "var(--text-muted)" }}>{status}</span>
          {elapsedTime > 0 && (
            <span className="text-[11px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>{elapsed(elapsedTime)}</span>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {currentPhase < 3 && (
              <button
                onClick={onSkipToSummary}
                className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold border transition-all hover:opacity-80"
                style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-10)" }}
                title="ข้ามไปสรุปมติเลย"
              >
                <SkipForward size={11} /> ข้ามไปสรุป
              </button>
            )}
            <button
              onClick={onStop}
              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              title="หยุด"
            >
              <Square size={12} />
            </button>
          </div>
        </div>

        {/* Phase steps */}
        <div className="flex items-center gap-1">
          {PHASES.map((step, i) => {
            const isDone = currentPhase > step.phase;
            const isActive = currentPhase === step.phase;
            return (
              <div key={step.phase} className="flex items-center gap-1 flex-1">
                <div
                  className="flex-1 px-2 py-1.5 rounded-lg text-center transition-all"
                  style={{
                    background: isDone ? "var(--accent-18)" : isActive ? "var(--accent)" : "var(--bg)",
                    color: isDone ? "var(--accent)" : isActive ? "#000" : "var(--text-muted)",
                    opacity: !isDone && !isActive ? 0.5 : 1,
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  <div className="text-[10px]">
                    {isDone ? "✓" : isActive ? "▶" : "○"} {step.icon}
                  </div>
                  <div className="text-[10px] leading-tight mt-0.5 hidden sm:block">{step.label}</div>
                  {isActive && step.phase === 1 && totalAgents > 1 && (
                    <div className="text-[10px] mt-0.5">
                      {phase1DoneCount}/{totalAgents} คน
                    </div>
                  )}
                </div>
                {i < PHASES.length - 1 && (
                  <div className="w-3 h-px flex-shrink-0" style={{ background: currentPhase > step.phase ? "var(--accent)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Phase 1 progress bar */}
        {currentPhase === 1 && totalAgents > 1 && (
          <div className="mt-2">
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((phase1DoneCount / totalAgents) * 100)}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        )}

        {/* Phase 3 synthesis banner */}
        {isSynthesizing && currentPhase === 3 && (
          <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--accent-8)" }}>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>ประธานกำลังสรุปมติ — กรุณารอสักครู่</span>
          </div>
        )}
      </div>
    </div>
  );
}
