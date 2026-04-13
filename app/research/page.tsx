"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { showToast } from "../components/Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  webSources?: WebSource[];
  clarificationAnswers?: { question: string; answer: string }[];
}

interface ConversationTurn {
  question: string;
  answer: string;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
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
  thinking: "กำลังคิด",
  finding: "นำเสนอ",
  analysis: "วิเคราะห์",
  synthesis: "มติประธาน",
  chat: "อภิปราย",
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
  { id: "full", label: "จำทั้งหมด — จำทุกรอบ" },
  { id: "last3", label: "จำ 3 รอบล่าสุด" },
  { id: "summary", label: "สรุปย่อ (ประหยัด)" },
  { id: "none", label: "ไม่จำ (ประหยัดสุด)" },
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

// Render message content — Markdown with collapsible long content
const COLLAPSE_LINE_LIMIT = 8;

function MessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const stripped = content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim();
  const lines = stripped.split("\n");
  const isLong = lines.length > COLLAPSE_LINE_LIMIT;
  const displayText = !expanded && isLong ? lines.slice(0, COLLAPSE_LINE_LIMIT).join("\n") : stripped;

  return (
    <div>
      <div className="prose-container text-sm leading-relaxed relative" style={{ color: "var(--text)" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5" style={{ color: "var(--text)" }}>{children}</h3>,
            h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1" style={{ color: "var(--text)" }}>{children}</h4>,
            h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text)" }}>{children}</h5>,
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--accent)" }}>{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>{children}</a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse" style={{ borderColor: "var(--border)" }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>{children}</thead>,
            th: ({ children }) => <th className="px-2 py-1.5 text-left border font-semibold text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</th>,
            td: ({ children }) => <td className="px-2 py-1.5 border text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</td>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 pl-3 my-2 italic" style={{ borderColor: "var(--accent)", color: "var(--text-muted)" }}>{children}</blockquote>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return <pre className="text-xs p-3 rounded-lg my-2 overflow-x-auto" style={{ background: "var(--bg)", color: "var(--text)" }}><code>{children}</code></pre>;
              }
              return <code className="text-xs px-1 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{children}</code>;
            },
            hr: () => <hr className="my-3" style={{ borderColor: "var(--border)" }} />,
          }}
        >
          {displayText}
        </ReactMarkdown>
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
    "# รายงานการประชุม",
    `> วันที่: ${new Date().toLocaleString("th-TH")}`,
    "",
  ];

  // Attendees (unique agents across all rounds)
  const attendeeIds = new Set<string>();
  rounds.forEach((r) => r.messages.forEach((m) => attendeeIds.add(m.agentId)));
  if (attendeeIds.size > 0) {
    lines.push("## ผู้เข้าร่วมประชุม", "");
    attendeeIds.forEach((id) => {
      const a = agentMap[id];
      if (a) lines.push(`- ${a.emoji} **${a.name}** (${a.role})`);
    });
    lines.push("");
  }

  rounds.forEach((round, i) => {
    lines.push(`---`, `## วาระที่ ${i + 1}: ${round.question}`, "");

    if (round.chairmanId) {
      const ch = agentMap[round.chairmanId];
      if (ch) lines.push(`**ประธานที่ประชุม:** ${ch.emoji} ${ch.name}`, "");
    }

    // Clarification Q&A
    if (round.clarificationAnswers && round.clarificationAnswers.length > 0) {
      lines.push("### ข้อมูลเพิ่มเติมจากผู้ถาม", "");
      round.clarificationAnswers.forEach((qa) => {
        lines.push(`- **ถาม:** ${qa.question}`, `  **ตอบ:** ${qa.answer}`, "");
      });
    }

    // Phase 1 — presentations
    const findings = round.messages.filter((m) => m.role === "finding");
    if (findings.length > 0) {
      lines.push("### ความเห็นจากที่ประชุม", "");
      findings.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    // Phase 2 — discussion
    const chats = round.messages.filter((m) => m.role === "chat");
    if (chats.length > 0) {
      lines.push("### อภิปราย", "");
      chats.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    // Phase 3 — synthesis/resolution
    if (round.finalAnswer) {
      lines.push("### มติที่ประชุม", round.finalAnswer.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim(), "");
    }

    // Web Sources
    if (round.webSources && round.webSources.length > 0) {
      lines.push("### แหล่งอ้างอิง", "");
      round.webSources.forEach((src, si) => {
        lines.push(`${si + 1}. [${src.title}](${src.url}) — ${src.domain}`);
      });
      lines.push("");
    }

    // Token summary
    if (round.agentTokens && Object.keys(round.agentTokens).length > 0) {
      const totalTokens = Object.values(round.agentTokens).reduce((sum, t) => sum + t.totalTokens, 0);
      lines.push(`> Token ที่ใช้ในวาระนี้: ${totalTokens.toLocaleString()}`, "");
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
  const [useMcpContext, setUseMcpContext] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [running, setRunning] = useState(false);
  const [agentTokens, setAgentTokens] = useState<Record<string, AgentTokenState>>({});
  const [status, setStatus] = useState("");
  const [chairmanId, setChairmanId] = useState<string | null>(null);
  const [searchingAgents, setSearchingAgents] = useState<Set<string>>(new Set());

  // Clarification state
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [pendingClarification, setPendingClarification] = useState(false);
  const pendingClarificationQuestionRef = useRef<string>("");
  const lastClarificationAnswersRef = useRef<{ question: string; answer: string }[] | undefined>(undefined);

  // Web sources state
  const [currentWebSources, setCurrentWebSources] = useState<WebSource[]>([]);
  const currentWebSourcesRef = useRef<WebSource[]>([]);

  // Meeting timer
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  // Smart mode (auto-detect QA vs meeting based on agent count)
  const [forceMode, setForceMode] = useState<"auto" | "meeting" | "qa">("auto");
  const skipToSummaryRef = useRef(false);
  const [pendingSkipToSummary, setPendingSkipToSummary] = useState(false);
  const handleCloseRef = useRef<() => void>(() => {});

  useEffect(() => { currentFinalAnswerRef.current = currentFinalAnswer; }, [currentFinalAnswer]);
  useEffect(() => { currentMessagesRef.current = currentMessages; }, [currentMessages]);
  useEffect(() => { currentSuggestionsRef.current = currentSuggestions; }, [currentSuggestions]);
  useEffect(() => { currentChartDataRef.current = currentChartData; }, [currentChartData]);
  useEffect(() => { chairmanIdRef.current = chairmanId; }, [chairmanId]);
  useEffect(() => { meetingSessionIdRef.current = meetingSessionId; }, [meetingSessionId]);
  useEffect(() => { currentWebSourcesRef.current = currentWebSources; }, [currentWebSources]);

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

  // Handle ?q= from dashboard quick-start templates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuestion(q);
  }, []);

  // Meeting timer
  useEffect(() => {
    if (!meetingStartTime) return;
    const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - meetingStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

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

  // Smart mode: auto = 1 agent→QA, 2+→meeting; user can override
  const effectiveMode = forceMode !== "auto" ? forceMode : selectedIds.size <= 1 ? "qa" : "meeting";

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

  const handleRun = async (overrideQuestion?: string, closeMode = false, withClarificationAnswers?: { question: string; answer: string }[]) => {
    const q = closeMode
      ? (rounds[0]?.question ?? "สรุปมติที่ประชุม")
      : (overrideQuestion ?? question).trim();
    if (!closeMode && selectedIds.size === 0) {
      showToast("warning", "กรุณาเลือกสมาชิกที่ประชุมก่อนเริ่มประชุม");
      return;
    }
    // Warn if any selected agent has no API key
    if (!closeMode) {
      const noKey = agents.filter(a => selectedIds.has(a.id) && !a.hasApiKey);
      if (noKey.length > 0) {
        showToast("warning", `⚠️ ${noKey.map(a => a.name).join(", ")} ยังไม่มี API Key — ไปตั้งค่าที่หน้า Agent ก่อน`);
        return;
      }
    }
    if (!closeMode && (!q || running)) return;
    if (closeMode && (rounds.length === 0 || running)) return;

    const isQA = !closeMode && effectiveMode === "qa";

    setViewingSession(null);
    setHistoryTab("current");
    setRunning(true);
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    if (!meetingStartTime && !isQA) setMeetingStartTime(Date.now());
    setCurrentSuggestions([]);
    setCurrentChartData(null);
    setAgentTokens({});
    setCurrentWebSources([]);
    currentWebSourcesRef.current = [];
    lastClarificationAnswersRef.current = withClarificationAnswers;
    setStatus(closeMode ? "🏛️ ประธานกำลังสรุปมติที่ประชุม..." : isQA ? "💬 กำลังตอบ..." : "");
    setChairmanId(null);
    setSearchingAgents(new Set());
    pendingClarificationQuestionRef.current = q;
    if (!overrideQuestion && !closeMode) setQuestion("");

    abortRef.current = new AbortController();
    const roundTokens: Record<string, AgentTokenState> = {};

    try {
      const body: Record<string, unknown> = {
        question: q,
        agentIds: Array.from(selectedIds),
        mode: closeMode ? "close" : isQA ? "qa" : "discuss",
        sessionId: meetingSessionIdRef.current || undefined,
        conversationHistory: buildHistory(),
        fileContexts: useFileContext ? buildFileContexts() : [],
        historyMode,
        disableMcp: !useMcpContext,
        clarificationAnswers: withClarificationAnswers || undefined,
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
            } else if (currentEvent === "clarification_needed") {
              setClarificationQuestions(payload.questions ?? []);
              setClarificationAnswers({});
              setPendingClarification(true);
            } else if (currentEvent === "web_sources") {
              const newSources: WebSource[] = payload.sources ?? [];
              setCurrentWebSources((prev) => {
                const seen = new Set(prev.map((s) => s.url));
                const fresh = newSources.filter((s: WebSource) => !seen.has(s.url));
                const merged = [...prev, ...fresh];
                currentWebSourcesRef.current = merged;
                return merged;
              });
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
            webSources: currentWebSourcesRef.current.length > 0 ? currentWebSourcesRef.current : undefined,
            clarificationAnswers: lastClarificationAnswersRef.current?.length ? lastClarificationAnswersRef.current : undefined,
          },
        ]);
      }
      if (skipToSummaryRef.current && !closeMode) {
        skipToSummaryRef.current = false;
        setTimeout(() => handleCloseRef.current(), 300);
      }
      if (closeMode) {
        // Meeting closed — clear session
        setMeetingSessionId(null);
        meetingSessionIdRef.current = null;
        setMeetingStartTime(null);
        setElapsedTime(0);
        showToast("success", "ปิดประชุมแล้ว — สรุปมติพร้อม");
      }
      setCurrentMessages([]);
      setCurrentFinalAnswer("");
      setCurrentSuggestions([]);
      setCurrentChartData(null);
      setCurrentWebSources([]);
      currentWebSourcesRef.current = [];
      setChairmanId(null);
      fetchServerHistory();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Handle clarification submit
  const handleClarificationSubmit = () => {
    const answers = clarificationQuestions.map((q) => ({
      question: q.question,
      answer: clarificationAnswers[q.id] || "(ไม่ระบุ)",
    }));
    setPendingClarification(false);
    setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, answers);
  };

  const handleSkipClarification = () => {
    setPendingClarification(false);
    setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, []);
  };

  const handleCloseMeeting = () => handleRun(undefined, true);
  handleCloseRef.current = handleCloseMeeting;

  const handleSkipToSummary = () => {
    const hasData = currentMessagesRef.current.some(m =>
      m.role === "finding" || m.role === "chat" || m.role === "analysis" || m.role === "synthesis"
    );
    if (!hasData && rounds.length === 0) {
      showToast("warning", "ยังไม่มีข้อมูลเพียงพอ — รอให้ agent นำเสนอก่อน");
      return;
    }
    skipToSummaryRef.current = true;
    abortRef.current?.abort();
  };

  // Auto-trigger close meeting after skip-to-summary abort settles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingSkipToSummary && !running && rounds.length > 0) {
      setPendingSkipToSummary(false);
      handleCloseMeeting();
    }
  }, [pendingSkipToSummary, running, rounds]);

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("หยุดแล้ว — พิมพ์คำถามใหม่ หรือกดสรุปมติ");
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
    let exportRounds: ConversationRound[];
    if (viewingSession) {
      // Convert server session to ConversationRound format for unified export
      exportRounds = [{
        question: viewingSession.question,
        messages: viewingSession.messages.map((m) => ({
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
      }];
    } else {
      if (rounds.length === 0) return;
      exportRounds = rounds;
    }
    const md = buildMinutesMarkdown(exportRounds, agents);
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
        <div className="text-xs mb-1 font-bold" style={{ color: "var(--text-muted)" }}>🧠 ความจำการประชุม</div>
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
            <span className="text-xs" style={{ color: useMcpContext ? "var(--text)" : "var(--text-muted)" }}>🔌 เชื่อมต่อระบบ ERP</span>
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
              className="md:hidden px-3 py-2 rounded-lg text-xs border flex items-center gap-1.5"
              style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            >
              ⚙️ ตั้งค่า · 👥 {selectedIds.size}/{agents.length}
            </button>
            {(rounds.length > 0 || viewingSession) && (
              <button onClick={exportMinutes} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                📄 <span className="hidden sm:inline">Export Minutes</span><span className="sm:hidden">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile quick-info strip ── */}
        <div className="flex md:hidden items-center gap-2 px-3 py-2 rounded-xl border text-[10px] flex-wrap" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}>
          <button onClick={() => setMobileSidebarOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ borderColor: selectedIds.size > 0 ? "var(--accent)" : "var(--border)", color: selectedIds.size > 0 ? "var(--accent)" : "var(--text-muted)" }}>
            👥 {selectedIds.size} agent{selectedIds.size !== 1 ? "s" : ""}
          </button>
          {useMcpContext && <span className="px-2 py-1 rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>🔌 MCP</span>}
          {useFileContext && attachedFiles.length > 0 && <span className="px-2 py-1 rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>📎 {attachedFiles.length} ไฟล์</span>}
          {!useMcpContext && !useFileContext && selectedIds.size > 0 && <span className="opacity-60">กดปุ่ม ⚙️ ตั้งค่า เพื่อเปิด MCP หรือแนบไฟล์</span>}
          {selectedIds.size === 0 && <span className="opacity-60">กดปุ่ม ⚙️ เพื่อเลือก Agent เข้าประชุม</span>}
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
                  <div className="text-xs px-3 py-2 rounded-lg border flex items-center gap-2" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))", color: "var(--text-muted)", background: "var(--surface)" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                    <span className="truncate">{status}</span>
                  </div>
                </div>
              )}

              {/* Clarification Questions UI */}
              {pendingClarification && clarificationQuestions.length > 0 && (
                <div className="mx-1 space-y-3">
                  <div className="border-2 rounded-xl p-4 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">💬</span>
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--accent)" }}>ต้องการข้อมูลเพิ่มเติม</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>กรุณาตอบคำถามเหล่านี้เพื่อให้ได้คำตอบที่แม่นยำขึ้น</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {clarificationQuestions.map((q, qi) => (
                        <div key={q.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                          <div className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                            {qi + 1}. {q.question}
                          </div>
                          {q.type === "choice" && q.options ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {q.options.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setClarificationAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                                    style={{
                                      borderColor: clarificationAnswers[q.id] === opt ? "var(--accent)" : "var(--border)",
                                      background: clarificationAnswers[q.id] === opt ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                                      color: clarificationAnswers[q.id] === opt ? "var(--accent)" : "var(--text)",
                                      fontWeight: clarificationAnswers[q.id] === opt ? 600 : 400,
                                    }}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="หรือพิมพ์คำตอบเอง..."
                                value={q.options.includes(clarificationAnswers[q.id] ?? "") ? "" : (clarificationAnswers[q.id] ?? "")}
                                onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                className="w-full text-xs px-3 py-1.5 rounded-lg border outline-none mt-1"
                                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="พิมพ์คำตอบ..."
                              value={clarificationAnswers[q.id] ?? ""}
                              onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleClarificationSubmit}
                        className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                        style={{ background: "var(--accent)", color: "#000" }}
                      >
                        ✓ ส่งคำตอบ เริ่มประชุม
                      </button>
                      <button
                        onClick={handleSkipClarification}
                        className="px-4 py-2 rounded-lg text-xs border transition-all hover:opacity-80"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        ข้ามไป →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!viewingSession && displayRounds.length === 0 && currentMessages.length === 0 && !running && !pendingClarification && (
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
                          {q}
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
                    msg.role === "thinking" ? (
                      <div key={msg.id} className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                        <span>{msg.agentEmoji}</span>
                        <span className="italic">{msg.content.slice(0, 100)}</span>
                      </div>
                    ) : (
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
                    )
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
                    msg.role === "thinking" ? (
                      <div key={msg.id} className="flex items-center gap-2 px-3 py-1.5 text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                        <span>{msg.agentEmoji}</span>
                        <span className="italic">{msg.content.slice(0, 100)}</span>
                      </div>
                    ) : (
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
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                    )
                  ))}

                  {round.finalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <div className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>🏛️ มติที่ประชุม</div>
                      <MessageContent content={round.finalAnswer} />
                      {round.chartData && <SimpleBarChart data={round.chartData} />}

                      {/* Web Sources */}
                      {round.webSources && round.webSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                          <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>📎 แหล่งอ้างอิง</div>
                          <div className="flex flex-wrap gap-1.5">
                            {round.webSources.map((src, si) => (
                              <a
                                key={si}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
                                title={src.snippet}
                              >
                                <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{src.domain}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t text-[11px] leading-relaxed" style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--text-muted)" }}>
                        ⚠️ คำตอบจาก AI เป็นข้อมูลเบื้องต้นเท่านั้น ควรตรวจสอบกับผู้เชี่ยวชาญหรืออ้างอิงกฎหมาย/มาตรฐานที่เกี่ยวข้องก่อนนำไปใช้จริง
                      </div>
                    </div>
                  )}

                  {roundIndex === displayRounds.length - 1 && round.suggestions.length > 0 && !running && currentMessages.length === 0 && (
                    <div className="space-y-2">
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>วาระต่อเนื่องที่แนะนำ:</div>
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
                    msg.role === "thinking" ? (
                      <div key={msg.id} className="flex items-center gap-2 px-3 py-1.5 text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>
                        <span>{msg.agentEmoji}</span>
                        <span className="italic">{msg.content.slice(0, 100)}</span>
                      </div>
                    ) : (
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
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                    )
                  ))}
                  {currentFinalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <div className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>🏛️ มติที่ประชุม</div>
                      <MessageContent content={currentFinalAnswer} />
                      {currentChartData && <SimpleBarChart data={currentChartData} />}

                      {/* Web Sources for current round */}
                      {currentWebSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                          <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>📎 แหล่งอ้างอิง</div>
                          <div className="flex flex-wrap gap-1.5">
                            {currentWebSources.map((src, si) => (
                              <a
                                key={si}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
                                title={src.snippet}
                              >
                                <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>{src.domain}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input box — ChatGPT-style sticky bottom */}
            {!viewingSession && (
              <div className="sticky bottom-0 flex-shrink-0 pt-2" style={{ background: "var(--bg)" }}>
                <div
                  className="border rounded-xl overflow-hidden transition-colors"
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
                    placeholder={effectiveMode === "qa" ? "พิมพ์คำถาม... (⌘+Enter ส่ง)" : meetingSessionId ? "ถามต่อได้เลย หรือกด 'สรุปมติ / ปิดประชุม' เมื่อพร้อม... (⌘+Enter ส่ง)" : rounds.length > 0 ? "พิมพ์วาระต่อไป... (⌘+Enter ส่ง)" : "พิมพ์วาระแรกเพื่อเริ่มประชุม... (⌘+Enter ส่ง)"}
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
                      <button
                        onClick={() => setForceMode(prev => prev === "auto" ? (effectiveMode === "qa" ? "meeting" : "qa") : "auto")}
                        className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded transition-all"
                        style={{ background: forceMode !== "auto" ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)", color: "var(--accent)" }}
                        title={effectiveMode === "qa" ? "โหมดถามตอบ — คลิกเพื่อสลับ" : "โหมดประชุม — คลิกเพื่อสลับ"}
                        disabled={running}
                      >
                        {effectiveMode === "qa" ? "💬" : "🏛️"}
                      </button>
                      <div className="text-[10px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {meetingSessionId && effectiveMode !== "qa" && <span className="inline-flex items-center gap-1 mr-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />ประชุมอยู่ {elapsedTime > 0 && <span className="font-mono">{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}</span>} · </span>}
                        {rounds.length > 0 && <span style={{ color: "var(--accent)" }}>{rounds.length} วาระ · </span>}
                        {selectedIds.size}/{agents.length} สมาชิก
                        {attachedFiles.length > 0 && <span> · 📎 {attachedFiles.length}</span>}
                        {(() => {
                          const totalTk = rounds.reduce((s, r) => s + Object.values(r.agentTokens).reduce((a, t) => a + t.totalTokens, 0), 0);
                          if (totalTk > 0) {
                            const costEst = totalTk * 0.000003; // rough average $/token
                            return <span> · 🪙 {totalTk > 1000 ? (totalTk / 1000).toFixed(1) + "K" : totalTk} tokens {costEst > 0.001 && `(~$${costEst.toFixed(3)})`}</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rounds.length > 0 && !running && meetingSessionId && effectiveMode !== "qa" && (
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
                        <>
                          {effectiveMode !== "qa" && (
                            <button
                              onClick={handleSkipToSummary}
                              className="h-8 px-3 rounded-lg flex items-center justify-center border text-xs font-bold transition-all hover:opacity-80"
                              style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                              title="ข้ามไปสรุปมติเลย"
                            >
                              📋 ข้ามไปสรุป
                            </button>
                          )}
                          <button
                            onClick={handleStop}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                            title="หยุด"
                          >
                            ⏹
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRun()}
                          disabled={!question.trim() || selectedIds.size === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                          style={{ background: "var(--accent)", color: "#000" }}
                          title={effectiveMode === "qa" ? "ส่งคำถาม (⌘+Enter)" : "เปิดวาระ (⌘+Enter)"}
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
