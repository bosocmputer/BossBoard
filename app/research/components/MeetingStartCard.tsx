"use client";

import { useRef } from "react";
import { Users, Paperclip, Settings, ChevronDown, ChevronUp, Send, UserPlus, ChevronRight } from "lucide-react";
import type { AttachedFile, Agent } from "../types";
import AdvancedSettingsSheet from "./AdvancedSettingsSheet";

interface Props {
  companyName: string;
  question: string;
  onQuestionChange: (v: string) => void;
  onRun: (q?: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  selectedClientId: string;
  onClientChange: (id: string) => void;
  clientProfiles: { id: string; name: string }[];
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
  selectedAgents: Pick<Agent, "id" | "emoji" | "name">[];
  onOpenTeamModal: () => void;
}

export default function MeetingStartCard({
  companyName, question, onQuestionChange, onRun,
  showAdvanced, onToggleAdvanced,
  selectedClientId, onClientChange, clientProfiles,
  historyMode, onHistoryModeChange,
  useFileContext, onToggleFileContext,
  useMcpContext, onToggleMcpContext,
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef, onFileInput, onDrop, onDragOver, onDragLeave,
  onRemoveFile, onClearFiles, onToggleSheet,
  selectedAgents, onOpenTeamModal,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canStart = selectedAgents.length > 0 && question.trim().length > 0;
  const selectedClient = clientProfiles.find(c => c.id === selectedClientId);

  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 space-y-6">

        {/* Hero — restrained, professional */}
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: "var(--accent)" }}>
            ห้องประชุมที่ปรึกษา
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold leading-tight" style={{ color: "var(--text)" }}>
            ปรึกษาเรื่องอะไรในวันนี้
          </h1>
          {companyName && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>สำนักงาน · {companyName}</p>
          )}
        </div>

        {/* Client selector — minimal label */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <span>ลูกค้า</span>
            <span className="font-normal normal-case tracking-normal" style={{ color: "var(--text-muted)" }}>— ไม่บังคับ</span>
            {selectedClientId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto normal-case tracking-normal" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>
                ใช้เป็น context
              </span>
            )}
          </label>
          <div
            className="border rounded-xl p-2.5"
            style={{
              borderColor: selectedClientId ? "var(--accent)" : "var(--border)",
              background: "var(--surface)",
            }}
          >
          {clientProfiles.length === 0 ? (
            <a
              href="/clients"
              className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg border hover:opacity-80 transition-all"
              style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)", color: "var(--accent)" }}
            >
              <span className="flex items-center gap-1.5"><UserPlus size={13} /> ยังไม่มีข้อมูลลูกค้า — เพิ่มที่หน้า /clients</span>
              <ChevronRight size={13} />
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => onClientChange(e.target.value)}
                title="เลือกลูกค้า"
                className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none"
                style={{ borderColor: selectedClientId ? "var(--accent)" : "var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                <option value="">— ถามทั่วไป (ไม่ระบุลูกค้า) —</option>
                {clientProfiles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <a
                href="/clients"
                className="flex items-center gap-1 text-xs px-2.5 py-2 rounded-lg border hover:opacity-80 flex-shrink-0"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                title="จัดการลูกค้า"
              >
                <UserPlus size={13} />
              </a>
            </div>
          )}
          </div>
        </div>

        {/* Question input — hero */}
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
              e.target.style.height = Math.min(e.target.scrollHeight, 240) + "px";
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canStart) { e.preventDefault(); onRun(); } }}
            rows={4}
            placeholder={selectedClient ? `พิมพ์คำถามเกี่ยวกับ ${selectedClient.name}...` : "พิมพ์คำถามที่ต้องการปรึกษา..."}
            className="w-full bg-transparent text-base resize-none outline-none px-4 pt-4 pb-2"
            style={{ color: "var(--text)", minHeight: 96, maxHeight: 240 }}
            autoFocus
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: attachedFiles.length > 0 ? "var(--accent)" : "var(--border)", color: attachedFiles.length > 0 ? "var(--accent)" : "var(--text-muted)" }}
                title="แนบเอกสาร"
              >
                <Paperclip size={13} />
                {attachedFiles.length > 0 ? `${attachedFiles.length}` : ""}
              </button>
              <button
                type="button"
                onClick={onToggleAdvanced}
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: showAdvanced ? "var(--accent)" : "var(--border)", color: showAdvanced ? "var(--accent)" : "var(--text-muted)" }}
                title="ตั้งค่าเพิ่ม"
              >
                <Settings size={13} />
                {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRun()}
              disabled={!canStart}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#000" }}
              title={canStart ? "เปิดประชุม (⌘+Enter)" : "พิมพ์คำถามและเลือกทีมก่อน"}
            >
              <Send size={14} /> เปิดประชุม
            </button>
          </div>
        </div>

        {/* Team preview — minimal label, professional */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Users size={11} />
              <span>ทีมที่ปรึกษา</span>
              {selectedAgents.length > 0 && (
                <span className="font-normal normal-case tracking-normal">— {selectedAgents.length} ท่าน</span>
              )}
            </label>
            <button
              type="button"
              onClick={onOpenTeamModal}
              className="text-[11px] hover:underline"
              style={{ color: "var(--accent)" }}
            >
              ปรับทีม
            </button>
          </div>
          {selectedAgents.length === 0 ? (
            <button
              type="button"
              onClick={onOpenTeamModal}
              className="w-full flex items-center justify-between text-xs px-3 py-2.5 rounded-lg border hover:opacity-80"
              style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)", color: "var(--accent)" }}
            >
              <span>ยังไม่ได้เลือกทีม — กดเพื่อเลือก</span>
              <ChevronRight size={13} />
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 flex-wrap px-2.5 py-2 rounded-xl border"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {selectedAgents.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]"
                  style={{ background: "var(--bg)", color: "var(--text)" }}
                  title={a.name}
                >
                  <span className="text-sm leading-none">{a.emoji}</span>
                  {a.name}
                </span>
              ))}
            </div>
          )}
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

        {/* Footer hint */}
        <div className="text-[11px] pt-1" style={{ color: "var(--text-muted)" }}>
          ⌘+Enter เพื่อเปิดประชุม
        </div>
      </div>
    </div>
  );
}
