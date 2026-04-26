"use client";

import { useRef } from "react";
import { Settings, Lightbulb, MessageSquare, Building2, Send, Square, SkipForward, Paperclip } from "lucide-react";
import { MEETING_TEMPLATES } from "../types";
import type { ConversationRound } from "../types";

interface Props {
  question: string;
  onQuestionChange: (v: string) => void;
  onRun: () => void;
  onStop: () => void;
  onSkipToSummary: () => void;
  onCloseMeeting: () => void;
  running: boolean;
  effectiveMode: "meeting" | "qa";
  forceMode: "auto" | "meeting" | "qa";
  onToggleMode: () => void;
  meetingSessionId: string | null;
  elapsedTime: number;
  rounds: ConversationRound[];
  selectedCount: number;
  totalAgents: number;
  attachedFilesCount: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  onSelectTemplate: (t: string) => void;
}

export default function MeetingInputBar({
  question, onQuestionChange, onRun, onStop, onSkipToSummary, onCloseMeeting,
  running, effectiveMode, forceMode, onToggleMode,
  meetingSessionId, elapsedTime, rounds,
  selectedCount, totalAgents, attachedFilesCount,
  showAdvanced, onToggleAdvanced,
  showTemplates, onToggleTemplates, onSelectTemplate,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex-shrink-0 pt-2" style={{ background: "var(--bg)" }}>
      <div
        className="border rounded-xl overflow-hidden transition-colors"
        style={{ borderColor: running ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
      >
        {/* Templates dropdown */}
        {showTemplates && (
          <div className="border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Lightbulb size={11} /> แม่แบบคำถาม
            </div>
            <div className="space-y-1">
              {MEETING_TEMPLATES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onSelectTemplate(t);
                    textareaRef.current?.focus();
                  }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all hover:bg-[var(--bg)]"
                  style={{ color: "var(--text)" }}
                >{t}</button>
              ))}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => {
            onQuestionChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onRun(); } }}
          disabled={running}
          rows={1}
          placeholder={
            effectiveMode === "qa"
              ? "พิมพ์คำถาม..."
              : meetingSessionId
              ? "ถามต่อได้เลย หรือกด 'สรุปมติ' เมื่อพร้อม..."
              : rounds.length > 0
              ? "พิมพ์วาระต่อไป..."
              : "พิมพ์วาระแรกเพื่อเริ่มประชุม..."
          }
          className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-1"
          style={{ color: "var(--text)", minHeight: 36, maxHeight: 160 }}
        />

        <div className="flex items-center justify-between px-3 pb-2 gap-2">
          {/* Left: controls */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onToggleAdvanced}
              className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg)]"
              style={{ color: showAdvanced ? "var(--accent)" : "var(--text-muted)" }}
              title="ตั้งค่าขั้นสูง"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={onToggleTemplates}
              className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg)]"
              style={{ color: showTemplates ? "var(--accent)" : "var(--text-muted)" }}
              title="แม่แบบคำถาม"
            >
              <Lightbulb size={14} />
            </button>
            <button
              onClick={onToggleMode}
              className="text-[11px] sm:text-xs px-1.5 py-0.5 rounded transition-all"
              style={{ background: forceMode !== "auto" ? "var(--accent-18)" : "var(--accent-8)", color: "var(--accent)" }}
              title={effectiveMode === "qa" ? "โหมดถามตอบ — คลิกเพื่อสลับ" : "โหมดประชุม — คลิกเพื่อสลับ"}
              disabled={running}
            >
              {effectiveMode === "qa" ? <MessageSquare size={12} /> : <Building2 size={12} />}
            </button>

            {/* Status text */}
            <div className="text-[11px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {meetingSessionId && effectiveMode !== "qa" && (
                <span className="inline-flex items-center gap-1 mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  ประชุมอยู่{" "}
                  {elapsedTime > 0 && (
                    <span className="font-mono">{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}</span>
                  )} ·{" "}
                </span>
              )}
              {rounds.length > 0 && <span style={{ color: "var(--accent)" }}>{rounds.length} วาระ · </span>}
              <span>{selectedCount}/{totalAgents} สมาชิก</span>
              {attachedFilesCount > 0 && (
                <span className="inline-flex items-center gap-0.5"> · <Paperclip size={10} /> {attachedFilesCount}</span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {rounds.length > 0 && !running && meetingSessionId && effectiveMode !== "qa" && (
              <button
                onClick={onCloseMeeting}
                className="h-8 px-3 rounded-lg flex items-center gap-1 text-xs font-bold transition-all hover:opacity-80"
                style={{ color: "#000", background: "var(--accent)" }}
                title="ให้ประธานสรุปมติที่ประชุม"
              >
                <Building2 size={14} /> สรุปมติ
              </button>
            )}
            {running ? (
              <>
                {effectiveMode !== "qa" && (
                  <button
                    onClick={onSkipToSummary}
                    className="h-8 px-3 rounded-lg flex items-center gap-1 border text-xs font-bold transition-all hover:opacity-80"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-10)" }}
                    title="ข้ามไปสรุปมติเลย"
                  >
                    <SkipForward size={14} /> ข้ามไปสรุป
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                  style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                  title="หยุด"
                >
                  <Square size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={onRun}
                disabled={!question.trim() || selectedCount === 0}
                className="h-8 px-3 rounded-lg flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-30 transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
                title={effectiveMode === "qa" ? "ส่งคำถาม (⌘+Enter)" : "เปิดวาระ (⌘+Enter)"}
              >
                <Send size={14} /> ส่ง
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
