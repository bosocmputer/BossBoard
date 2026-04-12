"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: string;
  model: string;
  role: string;
  active: boolean;
  hasApiKey: boolean;
  useWebSearch?: boolean;
  seniority?: number;
}

interface ResearchMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  role: "thinking" | "finding" | "analysis" | "synthesis" | "chat";
  content: string;
  tokensUsed: number;
  timestamp: string;
}

interface AgentTokenState {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

interface ConversationRound {
  question: string;
  messages: ResearchMessage[];
  finalAnswer: string;
  agentTokens: Record<string, AgentTokenState>;
  suggestions: string[];
  chartData?: ChartData;
  chairmanId?: string;
  isSynthesis?: boolean;
}

interface ConversationTurn {
  question: string;
  answer: string;
}

interface ServerSession {
  id: string;
  question: string;
  agentIds?: string[];
  status: string;
  startedAt: string;
  totalTokens: number;
  messages: ResearchMessage[];
  finalAnswer?: string;
}

interface AttachedFile {
  filename: string;
  meta: string;
  context: string;
  chars: number;
  size: number;
  sheets?: string[]; // available sheets for Excel
  selectedSheets?: string[]; // sheets to inject
}

const SUPPORTED_EXTENSIONS = [
  ".xlsx", ".xls", ".xlsm",
  ".pdf",
  ".docx", ".doc",
  ".csv",
  ".json",
  ".txt", ".md", ".log",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STORAGE_KEY = "research_conversation_v1";

const ROLE_LABEL: Record<string, string> = {
  thinking: "💭 กำลังคิด",
  finding: "📋 นำเสนอ",
  analysis: "📊 วิเคราะห์",
  synthesis: "🏛️ มติประธาน",
  chat: "💬 อภิปราย",
};

const ROLE_COLOR: Record<string, string> = {
  thinking: "border-yellow-500/30 bg-yellow-500/5",
  finding: "border-blue-500/30 bg-blue-500/5",
  analysis: "border-green-500/30 bg-green-500/5",
  synthesis: "border-purple-500/30 bg-purple-500/5",
  chat: "border-gray-500/30 bg-gray-500/5",
};

// Data Source = file attachments only (MCP moved to per-agent config)

const HISTORY_MODES = [
  { id: "full", label: "Full — จำทุกรอบ" },
  { id: "last3", label: "Last 3 — จำ 3 รอบล่าสุด" },
  { id: "summary", label: "Summary — สรุปย่อ (ประหยัด token)" },
  { id: "none", label: "None — ไม่จำ (ประหยัดสุด)" },
];

// Simple bar chart renderer (no external lib)
function SimpleBarChart({ data }: { data: ChartData }) {
  const allValues = data.datasets.flatMap((d) => d.data);
  const max = Math.max(...allValues, 1);
  const colors = ["var(--accent)", "#60a5fa", "#34d399", "#f472b6", "#fb923c"];

  return (
    <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs font-bold mb-3" style={{ color: "var(--accent)" }}>📊 {data.title}</div>
      {data.type === "pie" ? (
        // Simple pie-like display as percentage bars
        <div className="space-y-2">
          {data.labels.map((label, i) => {
            const val = data.datasets[0]?.data[i] ?? 0;
            const pct = Math.round((val / (allValues.reduce((a, b) => a + b, 0) || 1)) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="text-xs w-24 truncate" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                </div>
                <div className="text-xs w-10 text-right" style={{ color: "var(--text)" }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      ) : (
        // Bar/Line chart
        <div className="space-y-1">
          {data.datasets.map((dataset, di) => (
            <div key={di} className="space-y-1.5">
              {dataset.label && (
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{dataset.label}</div>
              )}
              {data.labels.map((label, i) => {
                const val = dataset.data[i] ?? 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-xs w-28 truncate text-right" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded flex items-center px-2 transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: colors[di % colors.length] }}>
                        <span className="text-[10px] text-white truncate">{val.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Render message content — strip ```chart blocks, collapsible if long
const COLLAPSE_LINE_LIMIT = 8;

function MessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const stripped = content.replace(/```chart\n[\s\S]*?\n```/g, "").trim();
  const lines = stripped.split("\n");
  const isLong = lines.length > COLLAPSE_LINE_LIMIT;
  const displayText = !expanded && isLong ? lines.slice(0, COLLAPSE_LINE_LIMIT).join("\n") : stripped;

  return (
    <div>
      <div
        className="text-sm whitespace-pre-wrap leading-relaxed relative"
        style={{ color: "var(--text)" }}
      >
        {displayText}
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none" style={{ background: "linear-gradient(transparent, var(--surface))" }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-1 px-2 py-0.5 rounded transition-all hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          {expanded ? "▲ ย่อข้อความ" : `▼ อ่านเพิ่ม (${lines.length} บรรทัด)`}
        </button>
      )}
    </div>
  );
}

// Meeting Minutes export
function buildMinutesMarkdown(rounds: ConversationRound[], agents: Agent[]): string {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const lines: string[] = [
    "# รายงานการประชุม (Meeting Minutes)",
    `> วันที่: ${new Date().toLocaleString("th-TH")}`,
    "",
  ];

  rounds.forEach((round, i) => {
    lines.push(`---`, `## วาระที่ ${i + 1}: ${round.question}`, "");

    if (round.chairmanId) {
      const ch = agentMap[round.chairmanId];
      if (ch) lines.push(`**ประธานที่ประชุม:** ${ch.emoji} ${ch.name} (${ch.role})`, "");
    }

    // Phase 1 — presentations
    const findings = round.messages.filter((m) => m.role === "finding");
    if (findings.length > 0) {
      lines.push("### 📋 ความเห็นจากที่ประชุม", "");
      findings.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName} (${m.role})`, m.content, "");
      });
    }

    // Phase 2 — discussion
    const chats = round.messages.filter((m) => m.role === "chat");
    if (chats.length > 0) {
      lines.push("### 💬 อภิปราย", "");
      chats.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    // Phase 3 — synthesis/resolution
    if (round.finalAnswer) {
      lines.push("### 🏛️ มติที่ประชุม", round.finalAnswer.replace(/```chart\n[\s\S]*?\n```/g, "").trim(), "");
    }

    // Token summary
    const totalTokens = Object.values(round.agentTokens).reduce((s, t) => s + t.totalTokens, 0);
    if (totalTokens > 0) {
      lines.push(`> Token รวม: ${totalTokens.toLocaleString()}`, "");
    }
  });

  return lines.join("\n");
}

export default function ResearchPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState("");
  const [historyMode, setHistoryMode] = useState<"full" | "last3" | "summary" | "none">("none");
  const [useFileContext, setUseFileContext] = useState(true);
  const [useMcpContext, setUseMcpContext] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [running, setRunning] = useState(false);
  const [agentTokens, setAgentTokens] = useState<Record<string, AgentTokenState>>({});
  const [status, setStatus] = useState("");
  const [chairmanId, setChairmanId] = useState<string | null>(null);
  const [searchingAgents, setSearchingAgents] = useState<Set<string>>(new Set());

  // Conversation state (persisted in localStorage)
  const [rounds, setRounds] = useState<ConversationRound[]>([]);
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ResearchMessage[]>([]);
  const [currentFinalAnswer, setCurrentFinalAnswer] = useState("");
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);

  // File attachments
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server history
  const [serverSessions, setServerSessions] = useState<ServerSession[]>([]);
  const [viewingSession, setViewingSession] = useState<ServerSession | null>(null);
  const [historyTab, setHistoryTab] = useState<"current" | "history">("current");
  const [companyName, setCompanyName] = useState("");

  const [autoScroll, setAutoScroll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentFinalAnswerRef = useRef("");
  const currentMessagesRef = useRef<ResearchMessage[]>([]);
  const currentSuggestionsRef = useRef<string[]>([]);
  const currentChartDataRef = useRef<ChartData | null>(null);
  const chairmanIdRef = useRef<string | null>(null);
  const meetingSessionIdRef = useRef<string | null>(null);

  useEffect(() => { currentFinalAnswerRef.current = currentFinalAnswer; }, [currentFinalAnswer]);
  useEffect(() => { currentMessagesRef.current = currentMessages; }, [currentMessages]);
  useEffect(() => { currentSuggestionsRef.current = currentSuggestions; }, [currentSuggestions]);
  useEffect(() => { currentChartDataRef.current = currentChartData; }, [currentChartData]);
  useEffect(() => { chairmanIdRef.current = chairmanId; }, [chairmanId]);
  useEffect(() => { meetingSessionIdRef.current = meetingSessionId; }, [meetingSessionId]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rounds) setRounds(parsed.rounds);
        if (parsed.meetingSessionId) {
          setMeetingSessionId(parsed.meetingSessionId);
          meetingSessionIdRef.current = parsed.meetingSessionId;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage when rounds change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rounds, meetingSessionId }));
    } catch { /* ignore */ }
  }, [rounds, meetingSessionId]);

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    const activeAgents = (data.agents ?? []).filter((a: Agent) => a.active);
    setAgents(activeAgents);
    setSelectedIds(new Set(activeAgents.map((a: Agent) => a.id)));
  }, []);

  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/team-research");
      const data = await res.json();
      setServerSessions((data.sessions ?? []).slice(0, 20));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchServerHistory();
    fetch("/api/team-settings").then(r => r.json()).then(d => { if (d.settings?.companyInfo?.name) setCompanyName(d.settings.companyInfo.name); }).catch(() => {});
  }, [fetchAgents, fetchServerHistory]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, rounds, autoScroll]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // ถ้าอยู่ห่างจากล่างสุดไม่เกิน 80px ถือว่าอยู่ล่างสุด
    setAutoScroll(distFromBottom < 80);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
  };

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadFile = async (file: File) => {
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
      // Parse available sheets for Excel files
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
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  };

  const toggleSheet = (fileIdx: number, sheet: string) => {
    setAttachedFiles((prev) => prev.map((f, i) => {
      if (i !== fileIdx) return f;
      const sel = f.selectedSheets ?? [];
      return {
        ...f,
        selectedSheets: sel.includes(sheet) ? sel.filter((s) => s !== sheet) : [...sel, sheet],
      };
    }));
  };

  const buildHistory = (): ConversationTurn[] =>
    rounds.filter(r => !r.isSynthesis).map((r) => ({
      question: r.question,
      answer: r.finalAnswer || r.messages
        .filter(m => m.role === "finding" || m.role === "chat" || m.role === "synthesis")
        .map(m => `${m.agentEmoji} ${m.agentName}: ${m.content.slice(0, 500)}`)
        .join("\n---\n"),
    }));

  const buildFileContexts = () =>
    attachedFiles.length > 0
      ? attachedFiles.map((f) => ({
          filename: f.filename,
          meta: f.meta,
          context: f.context,
          sheets: f.selectedSheets,
        }))
      : undefined;

  const handleRun = async (overrideQuestion?: string, closeMode = false) => {
    const q = closeMode
      ? (rounds[0]?.question ?? "สรุปมติที่ประชุม")
      : (overrideQuestion ?? question).trim();
    if (!closeMode && (!q || selectedIds.size === 0 || running)) return;
    if (closeMode && (rounds.length === 0 || running)) return;

    setViewingSession(null);
    setHistoryTab("current");
    setRunning(true);
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setCurrentSuggestions([]);
    setCurrentChartData(null);
    setAgentTokens({});
    setStatus(closeMode ? "🏛️ ประธานกำลังสรุปมติที่ประชุม..." : "");
    setChairmanId(null);
    setSearchingAgents(new Set());
    if (!overrideQuestion && !closeMode) setQuestion("");

    abortRef.current = new AbortController();
    const roundTokens: Record<string, AgentTokenState> = {};

    try {
      const body: Record<string, unknown> = {
        question: q,
        agentIds: Array.from(selectedIds),
        mode: closeMode ? "close" : "discuss",
        sessionId: meetingSessionIdRef.current || undefined,
        conversationHistory: buildHistory(),
        fileContexts: useFileContext ? buildFileContexts() : [],
        historyMode,
        disableMcp: !useMcpContext,
      };

      if (closeMode) {
        body.allRounds = rounds.filter(r => !r.isSynthesis).map(r => ({
          question: r.question,
          messages: r.messages.filter(m => m.role !== "thinking"),
        }));
      }

      const res = await fetch("/api/team-research/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (currentEvent === "session") {
              if (!meetingSessionIdRef.current) {
                meetingSessionIdRef.current = payload.sessionId;
                setMeetingSessionId(payload.sessionId);
              }
            } else if (currentEvent === "status" || ("message" in payload && typeof payload.message === "string")) {
              setStatus(payload.message);
            } else if (currentEvent === "chairman") {
              setChairmanId(payload.agentId);
              chairmanIdRef.current = payload.agentId;
            } else if (currentEvent === "agent_searching") {
              setSearchingAgents((prev) => new Set([...prev, payload.agentId]));
            } else if (currentEvent === "message" || ("content" in payload && "agentId" in payload)) {
              setSearchingAgents((prev) => { const n = new Set(prev); n.delete(payload.agentId); return n; });
              setCurrentMessages((prev) => [...prev, payload as ResearchMessage]);
            } else if (currentEvent === "final_answer" || ("content" in payload && !("agentId" in payload))) {
              setCurrentFinalAnswer(payload.content);
            } else if (currentEvent === "agent_tokens" || ("inputTokens" in payload)) {
              const t = { inputTokens: payload.inputTokens, outputTokens: payload.outputTokens, totalTokens: payload.totalTokens };
              roundTokens[payload.agentId] = t;
              setAgentTokens((prev) => ({ ...prev, [payload.agentId]: t }));
            } else if (currentEvent === "follow_up_suggestions" || "suggestions" in payload) {
              setCurrentSuggestions(payload.suggestions);
            } else if (currentEvent === "chart_data") {
              setCurrentChartData(payload);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus(`Error: ${e.message}`);
      }
    } finally {
      setRunning(false);
      setSearchingAgents(new Set());
      // Only add a round if there are messages (close mode may have only synthesis)
      if (currentMessagesRef.current.length > 0 || currentFinalAnswerRef.current) {
        setRounds((prev) => [
          ...prev,
          {
            question: closeMode ? "🏛️ สรุปมติที่ประชุม" : q,
            messages: currentMessagesRef.current,
            finalAnswer: currentFinalAnswerRef.current,
            agentTokens: roundTokens,
            suggestions: currentSuggestionsRef.current,
            chartData: currentChartDataRef.current ?? undefined,
            chairmanId: chairmanIdRef.current ?? undefined,
            isSynthesis: closeMode,
          },
        ]);
      }
      if (closeMode) {
        // Meeting closed — clear session
        setMeetingSessionId(null);
        meetingSessionIdRef.current = null;
      }
      setCurrentMessages([]);
      setCurrentFinalAnswer("");
      setCurrentSuggestions([]);
      setCurrentChartData(null);
      setChairmanId(null);
      fetchServerHistory();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleCloseMeeting = () => handleRun(undefined, true);

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("หยุดการทำงาน");
  };

  const loadServerSession = async (session: ServerSession) => {
    try {
      const res = await fetch(`/api/team-research/${session.id}`);
      const data = await res.json();
      if (data.session) {
        setViewingSession(data.session);
        setHistoryTab("history");
      }
    } catch { /* ignore */ }
  };

  const clearSession = () => {
    setRounds([]);
    setMeetingSessionId(null);
    meetingSessionIdRef.current = null;
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setCurrentSuggestions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportMinutes = () => {
    if (viewingSession) {
      const lines = [
        "# รายงานการประชุม (Meeting Minutes)",
        `> ${viewingSession.question}`,
        `> ${new Date(viewingSession.startedAt).toLocaleString("th-TH")}`,
        "",
        "### ความเห็นจากที่ประชุม",
        "",
      ];
      viewingSession.messages.forEach((m) => {
        if (m.role === "thinking") return;
        lines.push(`#### ${m.agentEmoji} ${m.agentName} (${ROLE_LABEL[m.role] ?? m.role})`, m.content, "");
      });
      if (viewingSession.finalAnswer) lines.push("### 🏛️ มติที่ประชุม", viewingSession.finalAnswer, "");
      const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `minutes-${Date.now()}.md`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (rounds.length === 0) return;
    const md = buildMinutesMarkdown(rounds, agents);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `minutes-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const displayRounds = rounds;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      {/* Agent selector */}
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xs mb-2 font-bold" style={{ color: "var(--text-muted)" }}>
            สมาชิกที่ประชุม ({selectedIds.size}/{agents.length})
          </div>
          {agents.length > 0 && (
            <button
              onClick={() => {
                if (selectedIds.size === agents.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(agents.map(a => a.id)));
              }}
              className="text-[10px] px-2 py-0.5 rounded border transition-all mb-2"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {selectedIds.size === agents.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
          )}
        </div>
        {agents.length === 0 ? (
          <div className="text-center py-6 px-3">
            <div className="text-2xl mb-2">🏛️</div>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>ยังไม่มี agent — สร้างทีมก่อนเพื่อเริ่มประชุม</p>
            <a href="/agents" className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-block" style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}>ไปสร้างทีม →</a>
          </div>
        ) : (
          <div className="space-y-1.5">
            {agents.map((agent) => {
              const tokens = agentTokens[agent.id];
              const isChairman = agent.id === chairmanId;
              const isSearching = searchingAgents.has(agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className="w-full text-left p-2 rounded-lg border transition-all"
                  style={{
                    borderColor: selectedIds.has(agent.id) ? "var(--accent)" : "var(--border)",
                    background: selectedIds.has(agent.id) ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{agent.name}</div>
                        {isChairman && <span className="text-[9px] px-1 rounded" style={{ background: "var(--accent)", color: "#000" }}>ประธาน</span>}
                        {agent.useWebSearch && <span className="text-[9px]" title="Web Search">🔍</span>}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{agent.role}</div>
                    </div>
                    {isSearching ? (
                      <span className="text-[9px] animate-pulse" style={{ color: "var(--accent)" }}>ค้นหา...</span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selectedIds.has(agent.id) ? "var(--accent)" : "var(--border)" }} />
                    )}
                  </div>
                  {tokens && (
                    <div className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {tokens.totalTokens.toLocaleString()} tokens
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced: History Mode + Data Source */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="w-full text-left text-xs px-3 py-2 rounded-lg border transition-all"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}
      >
        {showAdvanced ? "▾" : "▸"} ตั้งค่าขั้นสูง
      </button>
      {showAdvanced && (
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-xs mb-1 font-bold" style={{ color: "var(--text-muted)" }}>🧠 Context Memory</div>
        <select
          value={historyMode}
          onChange={(e) => setHistoryMode(e.target.value as typeof historyMode)}
          className="w-full px-2 py-1.5 rounded-lg border text-xs mb-2"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          {HISTORY_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        <div className="text-xs mb-1.5 font-bold" style={{ color: "var(--text-muted)" }}>Data Source</div>
        <div className="flex flex-col gap-1.5">
          {/* File toggle */}
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: useFileContext ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs" style={{ color: useFileContext ? "var(--text)" : "var(--text-muted)" }}>📎 เอกสารที่แนบ</span>
            <div onClick={() => setUseFileContext(v => !v)} className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0" style={{ background: useFileContext ? "var(--accent)" : "var(--border)" }}>
              <span className="absolute top-0.5 transition-all duration-200 w-3 h-3 rounded-full bg-white shadow" style={{ left: useFileContext ? "17px" : "2px" }} />
            </div>
          </label>
          {/* MCP toggle */}
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: useMcpContext ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs" style={{ color: useMcpContext ? "var(--text)" : "var(--text-muted)" }}>🔌 MCP ตาม Agent</span>
            <div onClick={() => setUseMcpContext(v => !v)} className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0" style={{ background: useMcpContext ? "var(--accent)" : "var(--border)" }}>
              <span className="absolute top-0.5 transition-all duration-200 w-3 h-3 rounded-full bg-white shadow" style={{ left: useMcpContext ? "17px" : "2px" }} />
            </div>
          </label>
        </div>
      </div>
      )}
      {showAdvanced && (
      <div
        className="border rounded-xl p-3"
        style={{ borderColor: isDragOver ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
            📎 เอกสารอ้างอิง ({attachedFiles.length})
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
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={handleFileInput}
            className="hidden"
            aria-label="แนบไฟล์อ้างอิง"
          />
        </div>

        {attachedFiles.length === 0 && !uploadingFile && (
          <div
            className="border-2 border-dashed rounded-lg p-3 text-center text-xs transition-all"
            style={{ borderColor: isDragOver ? "var(--accent)" : "var(--border)", color: "var(--text-muted)", background: isDragOver ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent" }}
          >
            {isDragOver ? "ปล่อยไฟล์เลย!" : "Drag & Drop หรือกด + แนบ"}
            <div className="mt-1 opacity-60">xlsx · pdf · docx · csv · json · txt</div>
          </div>
        )}

        {uploadError && <div className="mt-1 text-xs text-red-400">{uploadError}</div>}

        {attachedFiles.length > 0 && (
          <div className="space-y-2 mt-1">
            {attachedFiles.map((f, i) => (
              <div key={i} className="p-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">
                    {f.filename.endsWith(".xlsx") || f.filename.endsWith(".xls") || f.filename.endsWith(".csv") ? "📊" :
                     f.filename.endsWith(".pdf") ? "📄" :
                     f.filename.endsWith(".docx") || f.filename.endsWith(".doc") ? "📝" : "📋"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {formatBytes(f.size)} · {f.chars.toLocaleString()} chars
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs opacity-40 hover:opacity-100 flex-shrink-0"
                    aria-label="ลบไฟล์"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>
                {/* Sheet selector for Excel */}
                {f.sheets && f.sheets.length > 1 && (
                  <div className="mt-2">
                    <div className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>เลือก Sheet:</div>
                    <div className="flex flex-wrap gap-1">
                      {f.sheets.map((sheet) => {
                        const selected = f.selectedSheets?.includes(sheet) ?? true;
                        return (
                          <button
                            key={sheet}
                            onClick={() => toggleSheet(i, sheet)}
                            className="text-[10px] px-1.5 py-0.5 rounded border transition-all"
                            style={{
                              borderColor: selected ? "var(--accent)" : "var(--border)",
                              background: selected ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                              color: selected ? "var(--accent)" : "var(--text-muted)",
                            }}
                          >
                            {sheet}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setAttachedFiles([])}
              className="w-full text-[10px] py-1 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              ลบทั้งหมด
            </button>
          </div>
        )}
      </div>
      )}

      {/* History panel */}
      <div className="border rounded-xl flex-1 flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { setHistoryTab("current"); setViewingSession(null); }}
            className="flex-1 py-2 text-xs transition-all"
            style={{ color: historyTab === "current" ? "var(--accent)" : "var(--text-muted)", borderBottom: historyTab === "current" ? "2px solid var(--accent)" : "2px solid transparent" }}
          >
            💬 วาระ ({rounds.length})
          </button>
          <button
            onClick={() => setHistoryTab("history")}
            className="flex-1 py-2 text-xs transition-all"
            style={{ color: historyTab === "history" ? "var(--accent)" : "var(--text-muted)", borderBottom: historyTab === "history" ? "2px solid var(--accent)" : "2px solid transparent" }}
          >
            📋 ประวัติ ({serverSessions.length})
          </button>
        </div>

        {historyTab === "current" ? (
          <div className="p-3 flex-1 overflow-y-auto">
            {rounds.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>ยังไม่มีวาระ</div>
            ) : (
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <div className="font-bold mb-0.5" style={{ color: "var(--text)" }}>วาระที่ {i + 1}</div>
                    <div className="line-clamp-2" style={{ color: "var(--text-muted)" }}>{r.question}</div>
                  </div>
                ))}
                <button onClick={clearSession} className="w-full text-xs px-2 py-1.5 rounded-lg border mt-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  🗑 เริ่มการประชุมใหม่
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 flex-1 overflow-y-auto">
            {serverSessions.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>ไม่มีประวัติ</div>
            ) : (
              <div className="space-y-2">
                {serverSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { loadServerSession(s); onNavigate?.(); }}
                    className="w-full text-left p-2 rounded-lg border transition-all"
                    style={{
                      borderColor: viewingSession?.id === s.id ? "var(--accent)" : "var(--border)",
                      background: viewingSession?.id === s.id ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                    }}
                  >
                    <div className="text-xs line-clamp-2" style={{ color: "var(--text)" }}>{s.question}</div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {s.status === "completed" ? "✅" : s.status === "error" ? "❌" : "⏳"}{" "}
                      {new Date(s.startedAt).toLocaleDateString("th")}
                      {s.totalTokens > 0 && ` · ${s.totalTokens.toLocaleString()} tokens`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col p-3 sm:p-6 gap-3 sm:gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold" style={{ color: "var(--text)" }}>🏛️ Meeting Room{companyName ? ` — ${companyName}` : ""}</h1>
            <p className="text-xs sm:text-sm mt-1 hidden sm:block" style={{ color: "var(--text-muted)" }}>
              ห้องประชุม AI — ประธานนำทีมถกเถียงและสรุปมติทุกวาระ
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden px-3 py-2 rounded-lg text-xs border"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              👥 {selectedIds.size}/{agents.length}
            </button>
            {(rounds.length > 0 || viewingSession) && (
              <button onClick={exportMinutes} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                📄 <span className="hidden sm:inline">Export Minutes</span><span className="sm:hidden">Export</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

          {/* ── Mobile sidebar overlay ── */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-[55] md:hidden">
              <button
                className="absolute inset-0 bg-black/45"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close panel"
              />
              <aside className="absolute top-0 left-0 bottom-0 w-[300px] max-w-[88vw] border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="h-14 px-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                  <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>👥 ตั้งค่าการประชุม</div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="w-8 h-8 rounded-lg border text-base" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  >×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                  {renderSidebarContent(() => setMobileSidebarOpen(false))}
                </div>
              </aside>
            </div>
          )}

          {/* ── Left sidebar (desktop) ── */}
          <div className="hidden md:flex flex-col gap-3 w-64 flex-shrink-0">
            {renderSidebarContent()}
          </div>

          {/* ── Main panel ── */}
          <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-w-0">

            {/* Viewing server session banner */}
            {viewingSession && (
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs" style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)", background: "color-mix(in srgb, var(--accent) 7%, transparent)", color: "var(--text-muted)" }}>
                <span style={{ color: "var(--accent)" }}>📋 ดูประวัติ</span>
                <span className="flex-1 truncate">{viewingSession.question}</span>
                <button
                  onClick={() => { setViewingSession(null); setHistoryTab("current"); }}
                  className="ml-2 px-2 py-0.5 rounded border opacity-60 hover:opacity-100"
                  style={{ borderColor: "var(--border)" }}
                >
                  ✕ ปิด
                </button>
              </div>
            )}

            {/* Messages area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 min-h-[200px] sm:min-h-[300px] relative"
            >
              {/* Sticky status bar — shows which agent is speaking */}
              {running && status && (
                <div className="sticky top-0 z-10 mx-1">
                  <div className="text-xs px-3 py-2 rounded-lg border backdrop-blur-sm flex items-center gap-2" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))", color: "var(--text-muted)", background: "color-mix(in srgb, var(--surface) 90%, transparent)" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                    <span className="truncate">{status}</span>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!viewingSession && displayRounds.length === 0 && currentMessages.length === 0 && !running && (
                <div className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>
                  🏛️ ห้องประชุมพร้อมแล้ว — พิมพ์วาระแรกเพื่อเริ่มประชุม<br />
                  <span className="text-xs opacity-60">ประธานจะถูกเลือกอัตโนมัติจาก Role · agents จำ context ทุกวาระ</span>
                  {selectedIds.size > 0 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {[
                        "วิเคราะห์งบการเงินปี 2567 ของบริษัทนี้ — จุดแข็ง จุดอ่อน และข้อเสนอแนะ",
                        "วางแผนภาษีนิติบุคคลปี 2568 ให้ประหยัดสูงสุดตามกฎหมาย",
                        "ตรวจ compliance งบการเงินตาม TFRS — มีจุดไหนเสี่ยงบ้าง?",
                        "เปรียบเทียบ ratio ทางการเงิน 3 ปีย้อนหลัง และสรุปแนวโน้ม",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleRun(q)}
                          className="text-xs px-3 py-2 rounded-lg border transition-all hover:opacity-80 text-left max-w-xs"
                          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
                        >
                          💡 {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Viewing server session */}
              {viewingSession && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "#000" }}>
                      {viewingSession.question}
                    </div>
                  </div>
                  {viewingSession.messages.map((msg) => (
                    <div key={msg.id} className={`border rounded-xl p-3 sm:p-4 ${ROLE_COLOR[msg.role] ?? ""}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{msg.agentEmoji}</span>
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                        <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          {ROLE_LABEL[msg.role] ?? msg.role}
                        </span>
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                  ))}
                  {viewingSession.finalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <div className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>🏛️ มติที่ประชุม</div>
                      <MessageContent content={viewingSession.finalAnswer} />
                      <button
                        onClick={() => {
                          // Restore agents from original session
                          if (viewingSession.agentIds && viewingSession.agentIds.length > 0) {
                            setSelectedIds(new Set(viewingSession.agentIds));
                          }
                          // Build prior context from the original session's messages into a round
                          const priorRound: ConversationRound = {
                            question: viewingSession.question,
                            messages: viewingSession.messages.map((m: any) => ({
                              id: m.id,
                              agentId: m.agentId,
                              agentName: m.agentName,
                              agentEmoji: m.agentEmoji,
                              role: m.role,
                              content: m.content,
                              tokensUsed: m.tokensUsed,
                              timestamp: m.timestamp || new Date().toISOString(),
                            })),
                            finalAnswer: viewingSession.finalAnswer || "",
                            agentTokens: {},
                            suggestions: [],
                            chairmanId: undefined,
                          };
                          // Set up as a new multi-turn session with prior context
                          clearSession();
                          setRounds([priorRound]);
                          setMeetingSessionId(null);
                          meetingSessionIdRef.current = null;
                          setQuestion("");
                          setViewingSession(null);
                          setHistoryTab("current");
                        }}
                        className="mt-3 text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      >
                        🔄 นำวาระนี้กลับมาประชุมอีกครั้ง
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Current session rounds */}
              {!viewingSession && displayRounds.map((round, roundIndex) => (
                <div key={roundIndex} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                    <div className="text-xs px-3 py-1 rounded-full border" style={{
                      borderColor: "var(--accent)",
                      color: round.isSynthesis ? "#000" : "var(--accent)",
                      background: round.isSynthesis ? "var(--accent)" : "color-mix(in srgb, var(--accent) 8%, transparent)",
                      fontWeight: round.isSynthesis ? 700 : 400,
                    }}>
                      {round.isSynthesis ? "📋 สรุปมติที่ประชุม" : `วาระที่ ${roundIndex + 1}`}
                    </div>
                    <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                  </div>

                  {!round.isSynthesis && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "#000" }}>
                        {round.question}
                      </div>
                    </div>
                  )}

                  {round.messages.map((msg) => (
                    <div key={msg.id} className={`border rounded-xl p-3 sm:p-4 ${ROLE_COLOR[msg.role] ?? ""}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{msg.agentEmoji}</span>
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                        {round.chairmanId === msg.agentId && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "#000" }}>ประธาน</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          {ROLE_LABEL[msg.role] ?? msg.role}
                        </span>
                        {msg.tokensUsed > 0 && (
                          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{msg.tokensUsed.toLocaleString()} tokens</span>
                        )}
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                  ))}

                  {round.finalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <div className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>🏛️ มติที่ประชุม</div>
                      <MessageContent content={round.finalAnswer} />
                      {round.chartData && <SimpleBarChart data={round.chartData} />}
                    </div>
                  )}

                  {roundIndex === displayRounds.length - 1 && round.suggestions.length > 0 && !running && currentMessages.length === 0 && (
                    <div className="space-y-2">
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>💡 วาระต่อเนื่องที่แนะนำ:</div>
                      <div className="flex flex-col gap-1.5">
                        {round.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleRun(s)} disabled={running} className="text-left px-3 py-2 rounded-lg border text-xs transition-all hover:opacity-80 disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}>
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Current round in progress */}
              {!viewingSession && (currentMessages.length > 0 || running) && (
                <div className="space-y-3">
                  {displayRounds.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t" style={{ borderColor: "var(--border)" }} />
                      <div className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
                        วาระที่ {displayRounds.length + 1}
                      </div>
                      <div className="flex-1 border-t" style={{ borderColor: "var(--border)" }} />
                    </div>
                  )}
                  {currentMessages.map((msg) => (
                    <div key={msg.id} className={`border rounded-xl p-3 sm:p-4 ${ROLE_COLOR[msg.role] ?? ""}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{msg.agentEmoji}</span>
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                        {chairmanId === msg.agentId && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "#000" }}>ประธาน</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          {ROLE_LABEL[msg.role] ?? msg.role}
                        </span>
                        {msg.tokensUsed > 0 && (
                          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{msg.tokensUsed.toLocaleString()} tokens</span>
                        )}
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                  ))}
                  {currentFinalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <div className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>🏛️ มติที่ประชุม</div>
                      <MessageContent content={currentFinalAnswer} />
                      {currentChartData && <SimpleBarChart data={currentChartData} />}
                    </div>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
              {/* Scroll to bottom button */}
              {!autoScroll && (
                <div className="sticky bottom-3 flex justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all bg-accent text-black"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    ⬇ ไปล่างสุด
                  </button>
                </div>
              )}
            </div>

            {/* Input box — ChatGPT-style sticky bottom */}
            {!viewingSession && (
              <div className="sticky bottom-0 flex-shrink-0 pt-2" style={{ background: "var(--bg)" }}>
                <div
                  className="border rounded-2xl overflow-hidden transition-colors"
                  style={{ borderColor: running ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
                >
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleRun(); } }}
                    disabled={running}
                    rows={1}
                    placeholder={meetingSessionId ? "ถามต่อได้เลย หรือกด 'สรุปมติ / ปิดประชุม' เมื่อพร้อม... (⌘+Enter ส่ง)" : rounds.length > 0 ? "พิมพ์วาระต่อไป... (⌘+Enter ส่ง)" : "พิมพ์วาระแรกเพื่อเริ่มประชุม... (⌘+Enter ส่ง)"}
                    className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-1"
                    style={{ color: "var(--text)", minHeight: 36, maxHeight: 160 }}
                  />
                  <div className="flex items-center justify-between px-3 pb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg)]"
                        style={{ color: showAdvanced ? "var(--accent)" : "var(--text-muted)" }}
                        title="ตั้งค่าขั้นสูง"
                      >
                        ⚙️
                      </button>
                      <div className="text-[10px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {meetingSessionId && <span className="inline-flex items-center gap-1 mr-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />🟢 ประชุมอยู่ · </span>}
                        {rounds.length > 0 && <span style={{ color: "var(--accent)" }}>{rounds.length} วาระ · </span>}
                        {selectedIds.size}/{agents.length} สมาชิก
                        {attachedFiles.length > 0 && <span> · 📎 {attachedFiles.length}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rounds.length > 0 && !running && meetingSessionId && (
                        <button
                          onClick={handleCloseMeeting}
                          className="h-8 px-3 rounded-lg flex items-center justify-center border text-xs font-bold transition-all hover:opacity-80"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                          title="สรุปมติและปิดการประชุม"
                        >
                          📋 สรุปมติ / ปิดประชุม
                        </button>
                      )}
                      {running ? (
                        <button
                          onClick={handleStop}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                          title="หยุด"
                        >
                          ⏹
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRun()}
                          disabled={!question.trim() || selectedIds.size === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                          style={{ background: "var(--accent)", color: "#000" }}
                          title="เปิดวาระ (⌘+Enter)"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
