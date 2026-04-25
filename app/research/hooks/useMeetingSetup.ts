"use client";

import { useState, useRef, useCallback } from "react";
import type { Agent, AttachedFile } from "../types";
import { SUPPORTED_EXTENSIONS } from "../types";
import { formatBytes } from "../utils";
import { showToast } from "../../components/Toast";

export function useMeetingSetup() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState("");
  const [historyMode, setHistoryMode] = useState<"full" | "last3" | "summary" | "none">("none");
  const [useFileContext, setUseFileContext] = useState(true);
  const [useMcpContext, setUseMcpContext] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forceMode, setForceMode] = useState<"auto" | "meeting" | "qa">("auto");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientProfiles, setClientProfiles] = useState<{ id: string; name: string }[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [companyName, setCompanyName] = useState("");

  // File attachments
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    const activeAgents = (data.agents ?? []).filter((a: Agent) => a.active && !a.isSystem);
    setAgents(activeAgents);
  }, []);

  const fetchSettings = useCallback(async () => {
    fetch("/api/team-settings")
      .then(r => r.json())
      .then(d => { if (d.settings?.companyInfo?.name) setCompanyName(d.settings.companyInfo.name); })
      .catch(() => {});
    fetch("/api/client-profiles")
      .then(r => r.json())
      .then((d: { id: string; name: string }[]) => { if (Array.isArray(d)) setClientProfiles(d); })
      .catch(() => {});
  }, []);

  const toggleAgent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllAgents = useCallback(() => {
    setSelectedIds(new Set(agents.map(a => a.id)));
  }, [agents]);

  const deselectAllAgents = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("");
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setUploadError(`ไม่รองรับไฟล์ประเภท ${ext}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`ไฟล์ใหญ่เกิน 10MB (${formatBytes(file.size)})`);
      return;
    }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/team-research/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const sheets: string[] = [];
      if (data.meta && data.meta.includes("sheets:")) {
        const match = data.meta.match(/sheets: (.+)$/);
        if (match) sheets.push(...match[1].split(", ").map((s: string) => s.trim()));
      }
      setAttachedFiles((prev) => [...prev, {
        filename: data.filename,
        meta: data.meta,
        context: data.context,
        chars: data.chars,
        size: file.size,
        sheets: sheets.length > 0 ? sheets : undefined,
        selectedSheets: sheets.length > 0 ? sheets : undefined,
      }]);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploadingFile(false);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    e.target.value = "";
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }, [uploadFile]);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => setAttachedFiles([]), []);

  const toggleSheet = useCallback((fileIdx: number, sheet: string) => {
    setAttachedFiles((prev) => prev.map((f, i) => {
      if (i !== fileIdx) return f;
      const sel = f.selectedSheets ?? [];
      return {
        ...f,
        selectedSheets: sel.includes(sheet) ? sel.filter((s) => s !== sheet) : [...sel, sheet],
      };
    }));
  }, []);

  const buildFileContexts = useCallback(() =>
    attachedFiles.length > 0
      ? attachedFiles.map((f) => ({
          filename: f.filename,
          meta: f.meta,
          context: f.context,
          sheets: f.selectedSheets,
        }))
      : undefined,
  [attachedFiles]);

  // Smart mode: auto = 1 agent→QA, 2+→meeting
  const effectiveMode = forceMode !== "auto" ? forceMode : selectedIds.size <= 1 ? "qa" : "meeting";

  const validateBeforeRun = useCallback((closeMode: boolean): boolean => {
    if (!closeMode && selectedIds.size === 0) {
      showToast("warning", "กรุณาเลือกสมาชิกที่ประชุมก่อนเริ่มประชุม");
      return false;
    }
    if (!closeMode) {
      const noKey = agents.filter(a => selectedIds.has(a.id) && !a.hasApiKey);
      if (noKey.length > 0) {
        showToast("warning", `⚠️ ${noKey.map(a => a.name).join(", ")} ยังไม่มี API Key — ไปตั้งค่าที่หน้า Agent ก่อน`);
        return false;
      }
    }
    return true;
  }, [selectedIds, agents]);

  return {
    agents,
    selectedIds,
    question,
    historyMode,
    useFileContext,
    useMcpContext,
    showAdvanced,
    forceMode,
    effectiveMode,
    selectedClientId,
    clientProfiles,
    showTemplates,
    companyName,
    attachedFiles,
    uploadingFile,
    uploadError,
    isDragOver,
    fileInputRef,
    setAgents,
    setSelectedIds,
    setQuestion,
    setHistoryMode,
    setUseFileContext,
    setUseMcpContext,
    setShowAdvanced,
    setForceMode,
    setSelectedClientId,
    setShowTemplates,
    setIsDragOver,
    fetchAgents,
    fetchSettings,
    toggleAgent,
    selectAllAgents,
    deselectAllAgents,
    uploadFile,
    handleFileInput,
    handleDrop,
    removeFile,
    clearFiles,
    toggleSheet,
    buildFileContexts,
    validateBeforeRun,
  };
}
