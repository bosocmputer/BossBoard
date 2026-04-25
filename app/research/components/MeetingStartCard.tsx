"use client";

import { useRef } from "react";
import { Building2, Lightbulb, Paperclip, Settings, ChevronDown, ChevronUp, Send, AlertTriangle, Users } from "lucide-react";
import type { Agent, AttachedFile } from "../types";
import { MEETING_TEMPLATES } from "../types";
import AgentSetupPanel from "./AgentSetupPanel";
import AdvancedSettingsSheet from "./AdvancedSettingsSheet";

interface Props {
  companyName: string;
  agents: Agent[];
  selectedIds: Set<string>;
  onToggleAgent: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  question: string;
  onQuestionChange: (v: string) => void;
  onRun: (q?: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  // client selector (prominent)
  selectedClientId: string;
  onClientChange: (id: string) => void;
  clientProfiles: { id: string; name: string }[];
  // advanced settings
  historyMode: "full" | "last3" | "summary" | "none";
  onHistoryModeChange: (v: "full" | "last3" | "summary" | "none") => void;
  useFileContext: boolean;
  onToggleFileContext: () => void;
  useMcpContext: boolean;
  onToggleMcpContext: () => void;
  attachedFiles: AttachedFile[];
  uploadingFile: boolean;
  uploadError: string;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onRemoveFile: (i: number) => void;
  onClearFiles: () => void;
  onToggleSheet: (fileIdx: number, sheet: string) => void;
}

export default function MeetingStartCard({
  companyName, agents, selectedIds, onToggleAgent, onSelectAll, onDeselectAll,
  question, onQuestionChange, onRun,
  showAdvanced, onToggleAdvanced,
  selectedClientId, onClientChange, clientProfiles,
  historyMode, onHistoryModeChange,
  useFileContext, onToggleFileContext,
  useMcpContext, onToggleMcpContext,
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef, onFileInput, onDrop, onDragOver, onDragLeave,
  onRemoveFile, onClearFiles, onToggleSheet,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canStart = selectedIds.size > 0 && question.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-start py-6 px-2 sm:px-4">
      <div className="w-full max-w-2xl space-y-4">

        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building2 size={22} style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              เริ่มการประชุมใหม่{companyName ? ` — ${companyName}` : ""}
            </h2>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>เลือกสมาชิก พิมพ์วาระ แล้วกด "เริ่มประชุม"</p>
        </div>

        {/* Agent selector */}
        <AgentSetupPanel
          agents={agents}
          selectedIds={selectedIds}
          onToggle={onToggleAgent}
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

        {/* No agents warning */}
        {agents.length > 0 && selectedIds.size === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs" style={{ borderColor: "var(--danger-40)", background: "var(--danger-8)", color: "var(--danger)" }}>
            <AlertTriangle size={13} /> เลือกสมาชิกอย่างน้อย 1 คนก่อนเริ่มประชุม
          </div>
        )}

        {/* Client selector */}
        {clientProfiles.length > 0 && (
          <div className="border rounded-xl p-3" style={{ borderColor: selectedClientId ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}>
            <div className="text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Users size={11} /> สำหรับลูกค้า
              <span className="font-normal ml-1" style={{ color: "var(--text-muted)" }}>— ไม่บังคับ</span>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => onClientChange(e.target.value)}
              title="เลือกลูกค้า"
              className="w-full text-xs px-2 py-1.5 rounded-lg border outline-none"
              style={{ borderColor: selectedClientId ? "var(--accent)" : "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            >
              <option value="">ถามทั่วไป (ไม่เลือกลูกค้า)</option>
              {clientProfiles.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedClientId && (
              <div className="mt-1.5 text-[11px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
                ✓ ใช้ข้อมูล {clientProfiles.find(c => c.id === selectedClientId)?.name} เป็น context
              </div>
            )}
          </div>
        )}

        {/* Quick templates */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Lightbulb size={11} /> ลองถามเรื่องเหล่านี้
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MEETING_TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  onQuestionChange(t);
                  textareaRef.current?.focus();
                }}
                className="text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-80 text-left"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
              >
                {t.length > 40 ? t.slice(0, 40) + "…" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Question input */}
        <div
          className="border rounded-xl overflow-hidden transition-colors"
          style={{ borderColor: question.trim() ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
          onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => {
              onQuestionChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canStart) { e.preventDefault(); onRun(); } }}
            rows={3}
            placeholder="พิมพ์วาระที่ต้องการปรึกษา... (⌘+Enter เพื่อเริ่ม)"
            className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-2"
            style={{ color: "var(--text)", maxHeight: 160 }}
          />
          <div className="flex items-center justify-between px-3 pb-3 gap-2">
            <div className="flex items-center gap-2">
              {/* File attach inline trigger */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: attachedFiles.length > 0 ? "var(--accent)" : "var(--border)", color: attachedFiles.length > 0 ? "var(--accent)" : "var(--text-muted)" }}
                title="แนบเอกสาร"
              >
                <Paperclip size={13} />
                {attachedFiles.length > 0 ? `${attachedFiles.length} ไฟล์` : "แนบ"}
              </button>
              {/* Advanced toggle */}
              <button
                onClick={onToggleAdvanced}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: showAdvanced ? "var(--accent)" : "var(--border)", color: showAdvanced ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Settings size={13} />
                ตั้งค่าเพิ่ม
                {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            <button
              onClick={() => onRun()}
              disabled={!canStart}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              <Send size={15} /> เริ่มประชุม
            </button>
          </div>
        </div>

        {/* Advanced settings (collapsible) */}
        {showAdvanced && (
          <AdvancedSettingsSheet
            historyMode={historyMode}
            onHistoryModeChange={onHistoryModeChange}
            useFileContext={useFileContext}
            onToggleFileContext={onToggleFileContext}
            useMcpContext={useMcpContext}
            onToggleMcpContext={onToggleMcpContext}
            attachedFiles={attachedFiles}
            uploadingFile={uploadingFile}
            uploadError={uploadError}
            isDragOver={isDragOver}
            fileInputRef={fileInputRef}
            onFileInput={onFileInput}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onRemoveFile={onRemoveFile}
            onClearFiles={onClearFiles}
            onToggleSheet={onToggleSheet}
          />
        )}
      </div>
    </div>
  );
}
