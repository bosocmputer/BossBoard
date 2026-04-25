"use client";

import { FileText, FileSpreadsheet, File, Paperclip } from "lucide-react";
import type { AttachedFile } from "../types";
import { formatBytes } from "../utils";

interface Props {
  attachedFiles: AttachedFile[];
  uploadingFile: boolean;
  uploadError: string;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onRemove: (i: number) => void;
  onClear: () => void;
  onToggleSheet: (fileIdx: number, sheet: string) => void;
}

const ACCEPT = ".xlsx,.xls,.xlsm,.pdf,.docx,.doc,.csv,.json,.txt,.md,.log";

export default function FileAttachZone({
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef, onFileInput, onDrop, onDragOver, onDragLeave,
  onRemove, onClear, onToggleSheet,
}: Props) {
  return (
    <div
      className="border rounded-xl p-3"
      style={{ borderColor: isDragOver ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Paperclip size={12} /> เอกสารอ้างอิง ({attachedFiles.length})
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="text-xs px-2 py-1 rounded-lg border transition-all disabled:opacity-40"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {uploadingFile ? "⏳" : "+ แนบ"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onFileInput}
          className="hidden"
          aria-label="แนบไฟล์อ้างอิง"
        />
      </div>

      {attachedFiles.length === 0 && !uploadingFile && (
        <div
          className="border-2 border-dashed rounded-lg p-3 text-center text-xs transition-all"
          style={{
            borderColor: isDragOver ? "var(--accent)" : "var(--border)",
            color: "var(--text-muted)",
            background: isDragOver ? "var(--accent-5)" : "transparent",
          }}
        >
          {isDragOver ? "ปล่อยไฟล์เลย!" : "Drag & Drop หรือกด + แนบ"}
          <div className="mt-1 opacity-60">xlsx · pdf · docx · csv · json · txt</div>
        </div>
      )}

      {uploadError && <div className="mt-1 text-xs text-red-400">{uploadError}</div>}

      {attachedFiles.length > 0 && (
        <div className="space-y-2 mt-1">
          {attachedFiles.map((f, i) => (
            <div key={i} className="p-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--accent-5)" }}>
              <div className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0">
                  {f.filename.endsWith(".xlsx") || f.filename.endsWith(".xls") || f.filename.endsWith(".csv")
                    ? <FileSpreadsheet size={14} />
                    : f.filename.endsWith(".pdf")
                    ? <FileText size={14} />
                    : <File size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {formatBytes(f.size)} · {f.chars.toLocaleString()} chars
                  </div>
                </div>
                <button
                  onClick={() => onRemove(i)}
                  className="text-xs opacity-40 hover:opacity-100 flex-shrink-0"
                  aria-label="ลบไฟล์"
                  style={{ color: "var(--text-muted)" }}
                >✕</button>
              </div>
              {f.sheets && f.sheets.length > 1 && (
                <div className="mt-2">
                  <div className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>เลือก Sheet:</div>
                  <div className="flex flex-wrap gap-1">
                    {f.sheets.map((sheet) => {
                      const selected = f.selectedSheets?.includes(sheet) ?? true;
                      return (
                        <button key={sheet} onClick={() => onToggleSheet(i, sheet)}
                          className="text-[11px] px-1.5 py-0.5 rounded border transition-all"
                          style={{
                            borderColor: selected ? "var(--accent)" : "var(--border)",
                            background: selected ? "var(--accent-15)" : "transparent",
                            color: selected ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >{sheet}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={onClear} className="w-full text-[11px] py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ลบทั้งหมด</button>
        </div>
      )}
    </div>
  );
}
