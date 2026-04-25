"use client";

import { Brain, PlugZap, Building2, Briefcase, Paperclip } from "lucide-react";
import Tooltip from "../../components/Tooltip";
import { GLOSSARY } from "@/lib/glossary";
import { HISTORY_MODES } from "../types";
import FileAttachZone from "./FileAttachZone";
import type { AttachedFile } from "../types";

interface Props {
  historyMode: "full" | "last3" | "summary" | "none";
  onHistoryModeChange: (v: "full" | "last3" | "summary" | "none") => void;
  useFileContext: boolean;
  onToggleFileContext: () => void;
  useMcpContext: boolean;
  onToggleMcpContext: () => void;
  includeCompanyInfo: boolean;
  onToggleCompanyInfo: () => void;
  selectedClientId: string;
  onClientChange: (id: string) => void;
  clientProfiles: { id: string; name: string }[];
  // file attach props
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer" style={{ background: on ? "var(--accent)" : "var(--border)" }}>
      <span className="absolute top-0.5 transition-all duration-200 w-3 h-3 rounded-full bg-white shadow" style={{ left: on ? "17px" : "2px" }} />
    </div>
  );
}

export default function AdvancedSettingsSheet({
  historyMode, onHistoryModeChange,
  useFileContext, onToggleFileContext,
  useMcpContext, onToggleMcpContext,
  includeCompanyInfo, onToggleCompanyInfo,
  selectedClientId, onClientChange, clientProfiles,
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef, onFileInput, onDrop, onDragOver, onDragLeave,
  onRemoveFile, onClearFiles, onToggleSheet,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Memory */}
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-xs mb-1 font-bold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Brain size={12} /> ความจำการประชุม
          <Tooltip content={`${GLOSSARY.contextWindow?.short ?? ""} · เลือกว่าจะให้ AI จำรอบก่อน ๆ มากน้อยแค่ไหน — ยิ่งจำเยอะยิ่งเปลือง Token`}>
            <span className="text-[10px] px-1 rounded border cursor-help font-normal" style={{ borderColor: "var(--border)" }}>?</span>
          </Tooltip>
        </div>
        <select
          value={historyMode}
          onChange={(e) => onHistoryModeChange(e.target.value as typeof historyMode)}
          className="w-full px-2 py-1.5 rounded-lg border text-xs"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          {HISTORY_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      {/* Data sources */}
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-xs mb-1.5 font-bold" style={{ color: "var(--text-muted)" }}>แหล่งข้อมูล</div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: useFileContext ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs flex items-center gap-1" style={{ color: useFileContext ? "var(--text)" : "var(--text-muted)" }}><Paperclip size={11} /> เอกสารที่แนบ</span>
            <Toggle on={useFileContext} onToggle={onToggleFileContext} />
          </label>
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: useMcpContext ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs flex items-center gap-1" style={{ color: useMcpContext ? "var(--text)" : "var(--text-muted)" }}><PlugZap size={12} /> เชื่อมต่อระบบ ERP</span>
            <Toggle on={useMcpContext} onToggle={onToggleMcpContext} />
          </label>
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: includeCompanyInfo ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs flex items-center gap-1.5" style={{ color: includeCompanyInfo ? "var(--text)" : "var(--text-muted)" }}>
              <Building2 size={11} /> ข้อมูลบริษัทจาก Settings
              <Tooltip content="ปิดเมื่อถามเรื่องที่ไม่เกี่ยวกับธุรกิจ เช่น ดูดวง หรือเรื่องส่วนตัว">
                <span className="text-[10px] px-1 rounded border cursor-help" style={{ borderColor: "var(--border)" }}>?</span>
              </Tooltip>
            </span>
            <Toggle on={includeCompanyInfo} onToggle={onToggleCompanyInfo} />
          </label>
          {clientProfiles.length > 0 && (
            <div className="px-2 py-1.5 rounded-lg border" style={{ borderColor: selectedClientId ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
              <div className="text-xs mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Briefcase size={11} /> ลูกค้า (context injection)
              </div>
              <select
                className="w-full text-xs outline-none bg-transparent"
                style={{ color: "var(--text)" }}
                value={selectedClientId}
                onChange={(e) => onClientChange(e.target.value)}
              >
                <option value="">-- ไม่เลือก --</option>
                {clientProfiles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* File attach */}
      <FileAttachZone
        attachedFiles={attachedFiles}
        uploadingFile={uploadingFile}
        uploadError={uploadError}
        isDragOver={isDragOver}
        fileInputRef={fileInputRef}
        onFileInput={onFileInput}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onRemove={onRemoveFile}
        onClear={onClearFiles}
        onToggleSheet={onToggleSheet}
      />
    </div>
  );
}
