"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { showToast } from "../components/Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Building2, Settings, FileText, History,
  Paperclip, Send, Square, SkipForward,
  ChevronDown, ChevronRight, X, Download, Check,
  Clock, Coins, PlugZap,
  BarChart3, FileSpreadsheet, File, Trash2, RefreshCw,
  MessageSquare, Search, ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  sheets?: string[];
  selectedSheets?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "meeting_conversation_v1";

const SUPPORTED_EXTENSIONS = [
  ".xlsx", ".xls", ".xlsm",
  ".pdf",
  ".docx", ".doc",
  ".csv",
  ".json",
  ".txt", ".md", ".log",
];

const ROLE_LABEL: Record<string, string> = {
  thinking: "กำลังคิด",
  finding: "นำเสนอ",
  analysis: "วิเคราะห์",
  synthesis: "มติประธาน",
  chat: "อภิปราย",
};

const HISTORY_MODES = [
  { id: "full", label: "จำทั้งหมด" },
  { id: "last3", label: "จำ 3 รอบล่าสุด" },
  { id: "summary", label: "สรุปย่อ" },
  { id: "none", label: "ไม่จำ" },
];

const QUICK_TOPICS = [
  "วิเคราะห์งบการเงิน Q3",
  "วางแผนภาษีปี 2568",
  "ตรวจ TFRS compliance",
  "ทบทวนกลยุทธ์ประจำปี",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function buildMinutesMarkdown(rounds: ConversationRound[], agents: Agent[]): string {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const lines: string[] = [
    "# รายงานการประชุม",
    `> วันที่: ${new Date().toLocaleString("th-TH")}`,
    "",
  ];

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
    lines.push("---", `## วาระที่ ${i + 1}: ${round.question}`, "");
    if (round.chairmanId) {
      const ch = agentMap[round.chairmanId];
      if (ch) lines.push(`**ประธานที่ประชุม:** ${ch.emoji} ${ch.name}`, "");
    }
    if (round.clarificationAnswers && round.clarificationAnswers.length > 0) {
      lines.push("### ข้อมูลเพิ่มเติมจากผู้ถาม", "");
      round.clarificationAnswers.forEach((qa) => {
        lines.push(`- **ถาม:** ${qa.question}`, `  **ตอบ:** ${qa.answer}`, "");
      });
    }
    const findings = round.messages.filter((m) => m.role === "finding");
    if (findings.length > 0) {
      lines.push("### ความเห็นจากที่ประชุม", "");
      findings.forEach((m) => lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, ""));
    }
    const chats = round.messages.filter((m) => m.role === "chat");
    if (chats.length > 0) {
      lines.push("### อภิปราย", "");
      chats.forEach((m) => lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, ""));
    }
    if (round.finalAnswer) {
      lines.push("### มติที่ประชุม", round.finalAnswer.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim(), "");
    }
    if (round.webSources && round.webSources.length > 0) {
      lines.push("### แหล่งอ้างอิง", "");
      round.webSources.forEach((src, si) => {
        lines.push(`${si + 1}. [${src.title}](${src.url}) — ${src.domain}`);
      });
      lines.push("");
    }
    if (round.agentTokens && Object.keys(round.agentTokens).length > 0) {
      const totalTokens = Object.values(round.agentTokens).reduce((sum, t) => sum + t.totalTokens, 0);
      lines.push(`> Token ที่ใช้ในวาระนี้: ${totalTokens.toLocaleString()}`, "");
    }
  });

  return lines.join("\n");
}

// ─── SimpleBarChart ───────────────────────────────────────────────────────────

function SimpleBarChart({ data }: { data: ChartData }) {
  const allValues = data.datasets.flatMap((d) => d.data);
  const max = Math.max(...allValues, 1);
  const colors = ["var(--accent)", "#60a5fa", "#34d399", "#f472b6", "#fb923c"];

  return (
    <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <BarChart3 size={11} />
        {data.title}
      </div>
      {data.type === "pie" ? (
        <div className="space-y-1.5">
          {data.labels.map((label, i) => {
            const val = data.datasets[0]?.data[i] ?? 0;
            const pct = Math.round((val / (allValues.reduce((a, b) => a + b, 0) || 1)) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="text-xs w-20 truncate" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                </div>
                <div className="text-xs w-8 text-right font-mono" style={{ color: "var(--text)" }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {data.datasets.map((dataset, di) => (
            <div key={di} className="space-y-1">
              {dataset.label && <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{dataset.label}</div>}
              {data.labels.map((label, i) => {
                const val = dataset.data[i] ?? 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-xs w-24 truncate text-right" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded flex items-center px-1.5" style={{ width: `${Math.max(pct, 2)}%`, background: colors[di % colors.length] }}>
                        <span className="text-[10px] text-white truncate font-mono">{val.toLocaleString()}</span>
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

// ─── MessageContent ───────────────────────────────────────────────────────────

const COLLAPSE_LINE_LIMIT = 10;

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
            h1: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1" style={{ color: "var(--text)" }}>{children}</h3>,
            h2: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text)" }}>{children}</h4>,
            h3: ({ children }) => <h5 className="text-xs font-semibold mt-1.5 mb-0.5" style={{ color: "var(--text)" }}>{children}</h5>,
            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--text)" }}>{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "var(--accent)" }}>{children}</a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse" style={{ borderColor: "var(--border)" }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: "var(--surface)" }}>{children}</thead>,
            th: ({ children }) => <th className="px-2 py-1 text-left border font-medium text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{children}</th>,
            td: ({ children }) => <td className="px-2 py-1 border text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</td>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 pl-3 my-1.5 italic" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{children}</blockquote>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return <pre className="text-xs p-2.5 rounded my-1.5 overflow-x-auto" style={{ background: "var(--bg)", color: "var(--text)" }}><code>{children}</code></pre>;
              }
              return <code className="text-xs px-1 py-0.5 rounded font-mono" style={{ background: "var(--surface)", color: "var(--text)" }}>{children}</code>;
            },
            hr: () => <hr className="my-2" style={{ borderColor: "var(--border)" }} />,
          }}
        >
          {displayText}
        </ReactMarkdown>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: "linear-gradient(transparent, var(--card))" }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-1 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? "Show less" : `Show more (${lines.length} lines)`}
        </button>
      )}
    </div>
  );
}

// ─── PhaseStepper ─────────────────────────────────────────────────────────────

function PhaseStepper({ currentPhase, phase1DoneCount, totalAgents }: {
  currentPhase: number;
  phase1DoneCount: number;
  totalAgents: number;
}) {
  if (currentPhase === 0) return null;

  const steps = [
    { phase: 1, label: "Presentation" },
    { phase: 2, label: "Discussion" },
    { phase: 3, label: "Resolution" },
  ];

  return (
    <div className="hidden sm:flex items-center gap-2">
      {steps.map((step, i) => {
        const done = currentPhase > step.phase;
        const active = currentPhase === step.phase;
        return (
          <div key={step.phase} className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: done || active ? "var(--text)" : "var(--text-muted)" }}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono"
                style={{
                  background: done ? "var(--accent)" : active ? "var(--surface)" : "transparent",
                  border: `1px solid ${done ? "var(--accent)" : active ? "var(--border)" : "var(--border)"}`,
                  color: done ? "#000" : "inherit",
                }}
              >
                {done ? <Check size={8} /> : step.phase}
              </span>
              <span className="hidden md:inline">{step.label}</span>
              {step.phase === 1 && active && totalAgents > 1 && (
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {phase1DoneCount}/{totalAgents}
                </span>
              )}
            </div>
            {i < 2 && (
              <div className="w-6 h-px" style={{ background: done ? "var(--accent)" : "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AgentPanel ───────────────────────────────────────────────────────────────

function AgentPanel({
  agent, messages, isChairman, isSearching, isActive, tokens, running, isExpanded, onToggleExpand,
}: {
  agent: Agent;
  messages: ResearchMessage[];
  isChairman: boolean;
  isSearching: boolean;
  isActive: boolean;
  tokens?: AgentTokenState;
  running: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const substantiveMessages = messages.filter((m) => m.role !== "thinking");
  const latestMsg = substantiveMessages[substantiveMessages.length - 1];
  const hasActivity = isActive || isSearching;

  const statusText = isSearching
    ? "Searching..."
    : isActive
    ? "Responding..."
    : latestMsg
    ? ROLE_LABEL[latestMsg.role] ?? "Done"
    : running
    ? "Waiting..."
    : substantiveMessages.length > 0
    ? "Done"
    : "—";

  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{
        borderColor: hasActivity ? "var(--accent)" : "var(--border)",
        background: "var(--card)",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                {agent.name}
              </span>
              {isChairman && (
                <span
                  className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded font-semibold"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  Chair
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {hasActivity && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--accent)", animation: "pulse 1.5s infinite" }}
                />
              )}
              <span className="text-[11px] font-mono" style={{ color: hasActivity ? "var(--accent)" : "var(--text-muted)" }}>
                {statusText}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {tokens && tokens.totalTokens > 0 && (
            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {tokens.totalTokens > 999 ? `${(tokens.totalTokens / 1000).toFixed(1)}k` : tokens.totalTokens}
            </span>
          )}
          {agent.useWebSearch && (
            <Search size={10} style={{ color: "var(--text-muted)" }} />
          )}
          {substantiveMessages.length > 1 && (
            <button
              onClick={onToggleExpand}
              className="w-5 h-5 rounded flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 min-h-[120px] max-h-[280px]">
        {hasActivity && substantiveMessages.length === 0 && (
          <div className="flex items-center gap-1.5 py-2">
            <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              {isSearching ? "Searching web..." : "Thinking..."}
            </span>
            <span className="thinking-dots" style={{ color: "var(--text-muted)" }}>
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}

        {!isExpanded && latestMsg && (
          <div>
            <div
              className="text-[10px] uppercase tracking-wide mb-1.5 font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {ROLE_LABEL[latestMsg.role] ?? latestMsg.role}
            </div>
            <MessageContent content={latestMsg.content} />
          </div>
        )}

        {isExpanded && substantiveMessages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={i > 0 ? "mt-3 pt-3 border-t" : ""}
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="text-[10px] uppercase tracking-wide mb-1.5 font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {ROLE_LABEL[msg.role] ?? msg.role}
            </div>
            <MessageContent content={msg.content} />
          </div>
        ))}

        {!hasActivity && substantiveMessages.length === 0 && (
          <div className="py-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {running ? "Waiting to be called..." : "No response yet"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SynthesisPanel ───────────────────────────────────────────────────────────

function SynthesisPanel({ finalAnswer, chartData, webSources }: {
  finalAnswer: string;
  chartData?: ChartData | null;
  webSources?: WebSource[];
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden flex-shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <Building2 size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Resolution
        </span>
      </div>
      <div className="p-4 max-h-56 overflow-y-auto">
        <MessageContent content={finalAnswer} />
        {chartData && <SimpleBarChart data={chartData} />}
        {webSources && webSources.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] uppercase tracking-wide mb-2 font-mono" style={{ color: "var(--text-muted)" }}>
              Sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {webSources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
                  title={src.snippet}
                >
                  <span className="truncate max-w-[140px]">{src.title}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>{src.domain}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ClarificationOverlay ─────────────────────────────────────────────────────

function ClarificationOverlay({ questions, answers, onAnswer, onSubmit, onSkip }: {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, val: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>ข้อมูลเพิ่มเติม</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>ระบุเพิ่มเติมเพื่อให้ agent ตอบได้ตรงกว่า</div>
        </div>
        <div className="p-4 space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <div className="text-sm mb-2" style={{ color: "var(--text)" }}>{q.question}</div>
              {q.type === "choice" && q.options ? (
                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onAnswer(q.id, opt)}
                      className="w-full text-left px-3 py-2 rounded border text-sm transition-colors"
                      style={{
                        borderColor: answers[q.id] === opt ? "var(--accent)" : "var(--border)",
                        background: answers[q.id] === opt ? "var(--surface)" : "transparent",
                        color: "var(--text)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  placeholder="พิมพ์คำตอบ..."
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded text-sm border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ข้าม
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

function SettingsPanel({
  historyMode, onHistoryModeChange,
  useMcpContext, onToggleMcp,
  useFileContext, onToggleFileContext,
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef,
  onFileInput, onDrop, onDragOver, onDragLeave, onRemoveFile,
  onToggleSheet,
  onClose,
}: {
  historyMode: string;
  onHistoryModeChange: (v: string) => void;
  useMcpContext: boolean;
  onToggleMcp: () => void;
  useFileContext: boolean;
  onToggleFileContext: () => void;
  attachedFiles: AttachedFile[];
  uploadingFile: boolean;
  uploadError: string;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onRemoveFile: (i: number) => void;
  onToggleSheet: (fileIdx: number, sheet: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close settings" />
      <aside
        className="absolute top-0 right-0 bottom-0 w-72 border-l flex flex-col overflow-y-auto"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Settings</span>
          <button onClick={onClose} className="p-1 rounded transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Memory */}
          <div>
            <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Memory</div>
            <div className="space-y-1">
              {HISTORY_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onHistoryModeChange(m.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors text-left"
                  style={{
                    background: historyMode === m.id ? "var(--surface)" : "transparent",
                    color: historyMode === m.id ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  <span>{m.label}</span>
                  {historyMode === m.id && <Check size={12} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>

          {/* MCP */}
          <div>
            <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Data Sources</div>
            <button
              onClick={onToggleMcp}
              className="w-full flex items-center justify-between px-3 py-2 rounded text-sm border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <div className="flex items-center gap-2">
                <PlugZap size={13} style={{ color: "var(--text-muted)" }} />
                <span>MCP / ERP</span>
              </div>
              <div
                className="w-8 h-4 rounded-full relative"
                style={{ background: useMcpContext ? "var(--accent)" : "var(--border)" }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                  style={{ left: useMcpContext ? "18px" : "2px" }}
                />
              </div>
            </button>
          </div>

          {/* Files */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide font-mono" style={{ color: "var(--text-muted)" }}>Files</div>
              <button
                onClick={onToggleFileContext}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                style={{
                  color: useFileContext ? "var(--accent)" : "var(--text-muted)",
                  background: "var(--surface)",
                }}
              >
                {useFileContext ? "ON" : "OFF"}
              </button>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className="border border-dashed rounded px-3 py-3 cursor-pointer text-center transition-colors"
              style={{
                borderColor: isDragOver ? "var(--accent)" : "var(--border)",
                background: isDragOver ? "var(--surface)" : "transparent",
              }}
            >
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {uploadingFile ? "Uploading..." : "Drop or click to upload"}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                xlsx, pdf, docx, csv, txt...
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileInput} multiple />
            {uploadError && (
              <div className="mt-1.5 text-[11px]" style={{ color: "var(--danger, #ef4444)" }}>{uploadError}</div>
            )}
            {attachedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="rounded border p-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="flex items-start gap-1.5">
                      {f.filename.match(/\.(xlsx|xls|xlsm)$/i) ? (
                        <FileSpreadsheet size={11} style={{ color: "var(--text-muted)", marginTop: 1 }} />
                      ) : (
                        <File size={11} style={{ color: "var(--text-muted)", marginTop: 1 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                        <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {formatBytes(f.size)} · {f.chars.toLocaleString()} chars
                        </div>
                      </div>
                      <button onClick={() => onRemoveFile(i)} className="transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {f.sheets && f.sheets.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {f.sheets.map((sheet) => (
                          <button
                            key={sheet}
                            onClick={() => onToggleSheet(i, sheet)}
                            className="text-[10px] px-1.5 py-0.5 rounded border transition-colors"
                            style={{
                              borderColor: (f.selectedSheets ?? []).includes(sheet) ? "var(--accent)" : "var(--border)",
                              color: (f.selectedSheets ?? []).includes(sheet) ? "var(--accent)" : "var(--text-muted)",
                              background: "transparent",
                            }}
                          >
                            {sheet}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────

function HistoryPanel({
  rounds, serverSessions, viewingSession,
  onLoadSession, onClearSession, onClose,
}: {
  rounds: ConversationRound[];
  serverSessions: ServerSession[];
  viewingSession: ServerSession | null;
  onLoadSession: (s: ServerSession) => void;
  onClearSession: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"current" | "history">("current");

  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close history" />
      <aside
        className="absolute top-0 right-0 bottom-0 w-80 border-l flex flex-col"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>History</span>
          <button onClick={onClose} className="p-1 rounded transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {(["current", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-xs font-mono uppercase tracking-wide transition-colors"
              style={{
                color: tab === t ? "var(--text)" : "var(--text-muted)",
                borderBottom: tab === t ? "1px solid var(--accent)" : "none",
              }}
            >
              {t === "current" ? "This Session" : "Past Sessions"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "current" && (
            <div className="space-y-2">
              {rounds.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No rounds yet</p>
              ) : (
                rounds.map((r, i) => (
                  <div key={i} className="rounded border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text)" }}>
                      {i + 1}. {r.question}
                    </div>
                    {r.finalAnswer && (
                      <div className="text-[11px] line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        {r.finalAnswer.slice(0, 120)}...
                      </div>
                    )}
                    <div className="mt-1.5 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {r.messages.length} messages
                    </div>
                  </div>
                ))
              )}
              {rounds.length > 0 && (
                <button
                  onClick={onClearSession}
                  className="w-full py-2 rounded text-xs border mt-2 transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  Clear session
                </button>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-2">
              {serverSessions.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No past sessions</p>
              ) : (
                serverSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onLoadSession(s)}
                    className="w-full rounded border p-3 text-left transition-colors"
                    style={{
                      borderColor: viewingSession?.id === s.id ? "var(--accent)" : "var(--border)",
                      background: viewingSession?.id === s.id ? "var(--surface)" : "transparent",
                    }}
                  >
                    <div className="text-xs font-medium mb-0.5" style={{ color: "var(--text)" }}>
                      {s.question}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {new Date(s.startedAt).toLocaleDateString("th-TH")} · {s.totalTokens?.toLocaleString() ?? 0} tokens
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── SetupModal ───────────────────────────────────────────────────────────────

function SetupModal({
  agents, selectedIds, onToggleAgent, onSelectAll,
  question, onQuestionChange,
  historyMode, onHistoryModeChange,
  useFileContext, onToggleFileContext,
  useMcpContext, onToggleMcp,
  attachedFiles, uploadingFile, uploadError, isDragOver,
  fileInputRef, onFileInput, onDrop, onDragOver, onDragLeave,
  onRemoveFile, onToggleSheet,
  onStart,
  setupStep, onSetupStepChange,
}: {
  agents: Agent[];
  selectedIds: Set<string>;
  onToggleAgent: (id: string) => void;
  onSelectAll: () => void;
  question: string;
  onQuestionChange: (v: string) => void;
  historyMode: string;
  onHistoryModeChange: (v: string) => void;
  useFileContext: boolean;
  onToggleFileContext: () => void;
  useMcpContext: boolean;
  onToggleMcp: () => void;
  attachedFiles: AttachedFile[];
  uploadingFile: boolean;
  uploadError: string;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onRemoveFile: (i: number) => void;
  onToggleSheet: (fileIdx: number, sheet: string) => void;
  onStart: () => void;
  setupStep: 1 | 2 | 3;
  onSetupStepChange: (s: 1 | 2 | 3) => void;
}) {
  const canProceed1 = question.trim().length > 0;
  const canProceed2 = selectedIds.size > 0;
  const canStart = canProceed1 && canProceed2;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-md rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} style={{ color: "var(--text-muted)" }} />
            <h1 className="text-sm font-semibold tracking-wide" style={{ color: "var(--text)" }}>
              New Meeting
            </h1>
          </div>
          {/* Step tabs */}
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((s) => {
              const labels = ["Topic", "Team", "Options"];
              const done = setupStep > s;
              const active = setupStep === s;
              return (
                <button
                  key={s}
                  onClick={() => onSetupStepChange(s)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--text)" : done ? "var(--text-muted)" : "var(--text-muted)",
                    border: `1px solid ${active ? "var(--border)" : "transparent"}`,
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-mono flex-shrink-0"
                    style={{
                      background: done ? "var(--accent)" : active ? "var(--surface)" : "transparent",
                      border: `1px solid ${done ? "var(--accent)" : "var(--border)"}`,
                      color: done ? "#000" : "inherit",
                    }}
                  >
                    {done ? <Check size={7} /> : s}
                  </span>
                  {labels[s - 1]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="p-5 min-h-[260px]">
          {/* Step 1: Topic */}
          {setupStep === 1 && (
            <div>
              <label className="text-xs uppercase tracking-wide font-mono mb-2 block" style={{ color: "var(--text-muted)" }}>
                Meeting agenda
              </label>
              <textarea
                autoFocus
                value={question}
                onChange={(e) => onQuestionChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canProceed1) {
                    onSetupStepChange(2);
                  }
                }}
                placeholder="Describe the topic or question you want to discuss..."
                rows={4}
                className="w-full px-3 py-2.5 rounded border text-sm resize-none outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
              <div className="mt-3">
                <div className="text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>Quick start</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((t) => (
                    <button
                      key={t}
                      onClick={() => onQuestionChange(t)}
                      className="text-xs px-2 py-1 rounded border transition-colors hover:border-[var(--accent)]"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Team */}
          {setupStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs uppercase tracking-wide font-mono" style={{ color: "var(--text-muted)" }}>
                  Select members ({selectedIds.size})
                </label>
                {agents.length > 0 && (
                  <button
                    onClick={onSelectAll}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: "var(--accent)" }}
                  >
                    {selectedIds.size === agents.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              {agents.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No agents configured</div>
                  <a href="/agents" className="text-xs underline" style={{ color: "var(--accent)" }}>
                    Set up agents →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {agents.map((agent) => {
                    const selected = selectedIds.has(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => onToggleAgent(agent.id)}
                        className="p-3 rounded border text-left transition-colors"
                        style={{
                          borderColor: selected ? "var(--accent)" : "var(--border)",
                          background: selected ? "var(--surface)" : "transparent",
                        }}
                      >
                        <div className="text-xs font-medium mb-0.5" style={{ color: "var(--text)" }}>
                          {agent.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {agent.role}
                        </div>
                        {!agent.hasApiKey && (
                          <div className="text-[10px] mt-1" style={{ color: "var(--danger, #ef4444)" }}>No API key</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Options */}
          {setupStep === 3 && (
            <div className="space-y-4">
              {/* Memory */}
              <div>
                <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Memory</div>
                <div className="grid grid-cols-2 gap-1">
                  {HISTORY_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onHistoryModeChange(m.id)}
                      className="px-2.5 py-2 rounded border text-xs text-left flex items-center justify-between transition-colors"
                      style={{
                        borderColor: historyMode === m.id ? "var(--accent)" : "var(--border)",
                        background: historyMode === m.id ? "var(--surface)" : "transparent",
                        color: historyMode === m.id ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      {m.label}
                      {historyMode === m.id && <Check size={10} style={{ color: "var(--accent)" }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* MCP */}
              <div>
                <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Data Sources</div>
                <button
                  onClick={onToggleMcp}
                  className="w-full flex items-center justify-between px-3 py-2 rounded border text-sm transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <div className="flex items-center gap-2">
                    <PlugZap size={13} style={{ color: "var(--text-muted)" }} />
                    <span>MCP / ERP Connection</span>
                  </div>
                  <div
                    className="w-8 h-4 rounded-full relative"
                    style={{ background: useMcpContext ? "var(--accent)" : "var(--border)" }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                      style={{ left: useMcpContext ? "18px" : "2px" }}
                    />
                  </div>
                </button>
              </div>

              {/* Files */}
              <div>
                <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Files</div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className="border border-dashed rounded px-3 py-4 cursor-pointer text-center transition-colors"
                  style={{
                    borderColor: isDragOver ? "var(--accent)" : "var(--border)",
                    background: isDragOver ? "var(--surface)" : "transparent",
                  }}
                >
                  <Paperclip size={13} className="mx-auto mb-1" style={{ color: "var(--text-muted)" }} />
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {uploadingFile ? "Uploading..." : "Drop files or click to browse"}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFileInput} multiple />
                {uploadError && (
                  <div className="mt-1 text-xs" style={{ color: "var(--danger, #ef4444)" }}>{uploadError}</div>
                )}
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <FileText size={11} style={{ color: "var(--text-muted)" }} />
                        <span className="flex-1 text-xs truncate" style={{ color: "var(--text)" }}>{f.filename}</span>
                        <button onClick={() => onRemoveFile(i)} style={{ color: "var(--text-muted)" }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            disabled={setupStep === 1}
            onClick={() => onSetupStepChange((setupStep - 1) as 1 | 2 | 3)}
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          {setupStep < 3 ? (
            <button
              onClick={() => onSetupStepChange((setupStep + 1) as 2 | 3)}
              disabled={setupStep === 1 ? !canProceed1 : !canProceed2}
              className="px-4 py-2 rounded text-sm font-medium disabled:opacity-30 transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={!canStart}
              className="px-5 py-2 rounded text-sm font-medium disabled:opacity-30 transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              <Building2 size={13} />
              Start Meeting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingPage() {
  // View
  const [view, setView] = useState<"setup" | "room">("setup");
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);

  // Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Input
  const [question, setQuestion] = useState("");
  const [historyMode, setHistoryMode] = useState<"full" | "last3" | "summary" | "none">("none");
  const [useFileContext, setUseFileContext] = useState(true);
  const [useMcpContext, setUseMcpContext] = useState(false);
  const [forceMode, setForceMode] = useState<"auto" | "meeting" | "qa">("auto");

  // Running state
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [chairmanId, setChairmanId] = useState<string | null>(null);
  const [searchingAgents, setSearchingAgents] = useState<Set<string>>(new Set());
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set());
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2 | 3>(0);
  const [phase1DoneCount, setPhase1DoneCount] = useState(0);
  const [agentTokens, setAgentTokens] = useState<Record<string, AgentTokenState>>({});

  // Clarification
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [pendingClarification, setPendingClarification] = useState(false);

  // Web sources
  const [currentWebSources, setCurrentWebSources] = useState<WebSource[]>([]);

  // Timer
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Conversation
  const [rounds, setRounds] = useState<ConversationRound[]>([]);
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ResearchMessage[]>([]);
  const [currentFinalAnswer, setCurrentFinalAnswer] = useState("");
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);

  // Files
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server history
  const [serverSessions, setServerSessions] = useState<ServerSession[]>([]);
  const [viewingSession, setViewingSession] = useState<ServerSession | null>(null);
  const [companyName, setCompanyName] = useState("");

  // Panel state
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentFinalAnswerRef = useRef("");
  const currentMessagesRef = useRef<ResearchMessage[]>([]);
  const currentSuggestionsRef = useRef<string[]>([]);
  const currentChartDataRef = useRef<ChartData | null>(null);
  const chairmanIdRef = useRef<string | null>(null);
  const meetingSessionIdRef = useRef<string | null>(null);
  const currentWebSourcesRef = useRef<WebSource[]>([]);
  const pendingClarificationQuestionRef = useRef<string>("");
  const lastClarificationAnswersRef = useRef<{ question: string; answer: string }[] | undefined>(undefined);
  const skipToSummaryRef = useRef(false);
  const handleCloseRef = useRef<() => void>(() => {});
  const [pendingSkipToSummary, setPendingSkipToSummary] = useState(false);
  const viewRef = useRef<"setup" | "room">("setup");

  // Sync refs
  useEffect(() => { currentFinalAnswerRef.current = currentFinalAnswer; }, [currentFinalAnswer]);
  useEffect(() => { currentMessagesRef.current = currentMessages; }, [currentMessages]);
  useEffect(() => { currentSuggestionsRef.current = currentSuggestions; }, [currentSuggestions]);
  useEffect(() => { currentChartDataRef.current = currentChartData; }, [currentChartData]);
  useEffect(() => { chairmanIdRef.current = chairmanId; }, [chairmanId]);
  useEffect(() => { meetingSessionIdRef.current = meetingSessionId; }, [meetingSessionId]);
  useEffect(() => { currentWebSourcesRef.current = currentWebSources; }, [currentWebSources]);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Load from localStorage
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

  // Save to localStorage
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
    fetch("/api/team-settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings?.companyInfo?.name) setCompanyName(d.settings.companyInfo.name); })
      .catch(() => {});
  }, [fetchAgents, fetchServerHistory]);

  // URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) { setQuestion(q); }

    const teamId = params.get("teamId");
    if (teamId) {
      fetch(`/api/teams/${teamId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.team?.agentIds?.length) {
            setSelectedIds(new Set(data.team.agentIds));
            setSetupStep(2);
          }
        })
        .catch(() => {});
    }

    const sessionId = params.get("sessionId");
    if (sessionId) {
      fetch(`/api/team-research/${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.session) {
            setViewingSession(data.session);
            if (data.session.agentIds?.length) {
              setSelectedIds(new Set(data.session.agentIds));
            }
            setView("room");
          }
        })
        .catch(() => {});
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!meetingStartTime) return;
    const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - meetingStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  // Per-agent message map
  const agentMessageMap = useMemo<Map<string, ResearchMessage[]>>(() => {
    const map = new Map<string, ResearchMessage[]>();
    currentMessages.forEach((msg) => {
      if (!map.has(msg.agentId)) map.set(msg.agentId, []);
      map.get(msg.agentId)!.push(msg);
    });
    return map;
  }, [currentMessages]);

  const effectiveMode = forceMode !== "auto" ? forceMode : selectedIds.size <= 1 ? "qa" : "meeting";

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === agents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(agents.map((a) => a.id)));
  };

  const uploadFile = async (file: File) => {
    setUploadError("");
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SUPPORTED_EXTENSIONS.includes(ext)) { setUploadError(`ไม่รองรับไฟล์ประเภท ${ext}`); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError(`ไฟล์ใหญ่เกิน 10MB`); return; }
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
        filename: data.filename, meta: data.meta, context: data.context,
        chars: data.chars, size: file.size,
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
    Array.from(e.target.files ?? []).forEach(uploadFile);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); Array.from(e.dataTransfer.files).forEach(uploadFile); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };

  const toggleSheet = (fileIdx: number, sheet: string) => {
    setAttachedFiles((prev) => prev.map((f, i) => {
      if (i !== fileIdx) return f;
      const sel = f.selectedSheets ?? [];
      return { ...f, selectedSheets: sel.includes(sheet) ? sel.filter((s) => s !== sheet) : [...sel, sheet] };
    }));
  };

  const buildHistory = (): ConversationTurn[] =>
    rounds.filter((r) => !r.isSynthesis).map((r) => ({
      question: r.question,
      answer: r.finalAnswer || r.messages
        .filter((m) => m.role === "finding" || m.role === "chat" || m.role === "synthesis")
        .map((m) => `${m.agentEmoji} ${m.agentName}: ${m.content.slice(0, 500)}`)
        .join("\n---\n"),
    }));

  const buildFileContexts = () =>
    attachedFiles.length > 0
      ? attachedFiles.map((f) => ({ filename: f.filename, meta: f.meta, context: f.context, sheets: f.selectedSheets }))
      : undefined;

  const handleRun = async (overrideQuestion?: string, closeMode = false, withClarificationAnswers?: { question: string; answer: string }[]) => {
    // Transition to room on first run
    if (!closeMode && viewRef.current === "setup") {
      setView("room");
    }

    const q = closeMode
      ? (rounds[0]?.question ?? "สรุปมติที่ประชุม")
      : (overrideQuestion ?? question).trim();

    if (!closeMode && selectedIds.size === 0) { showToast("warning", "กรุณาเลือกสมาชิกที่ประชุมก่อนเริ่ม"); return; }
    if (!closeMode) {
      const noKey = agents.filter((a) => selectedIds.has(a.id) && !a.hasApiKey);
      if (noKey.length > 0) { showToast("warning", `${noKey.map((a) => a.name).join(", ")} ยังไม่มี API Key`); return; }
    }
    if (!closeMode && (!q || running)) return;
    if (closeMode && (rounds.length === 0 || running)) return;

    const isQA = !closeMode && effectiveMode === "qa";

    setViewingSession(null);
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
    setStatus(closeMode ? "Summarizing resolution..." : isQA ? "Responding..." : "");
    setChairmanId(null);
    setSearchingAgents(new Set());
    pendingClarificationQuestionRef.current = q;
    setActiveAgentIds(new Set());
    setCurrentPhase(0);
    setPhase1DoneCount(0);
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
        body.allRounds = rounds.filter((r) => !r.isSynthesis).map((r) => ({
          question: r.question,
          messages: r.messages.filter((m) => m.role !== "thinking"),
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
          if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (currentEvent === "session") {
              if (!meetingSessionIdRef.current) { meetingSessionIdRef.current = payload.sessionId; setMeetingSessionId(payload.sessionId); }
            } else if (currentEvent === "status" || ("message" in payload && typeof payload.message === "string")) {
              setStatus(payload.message);
              const msg = payload.message as string;
              if (msg.includes("Phase 1")) setCurrentPhase(1);
              else if (msg.includes("Phase 2") || msg.includes("อภิปราย")) setCurrentPhase(2);
              else if (msg.includes("Phase 3") || msg.includes("สรุปมติ")) setCurrentPhase(3);
            } else if (currentEvent === "chairman") {
              setChairmanId(payload.agentId); chairmanIdRef.current = payload.agentId;
            } else if (currentEvent === "agent_start" || currentEvent === "agent_searching") {
              setActiveAgentIds((prev) => new Set([...prev, payload.agentId]));
              if (currentEvent === "agent_searching") setSearchingAgents((prev) => new Set([...prev, payload.agentId]));
            } else if (currentEvent === "message" || ("content" in payload && "agentId" in payload)) {
              setSearchingAgents((prev) => { const n = new Set(prev); n.delete(payload.agentId); return n; });
              if ((payload as ResearchMessage).role !== "thinking") {
                setActiveAgentIds((prev) => { const n = new Set(prev); n.delete(payload.agentId); return n; });
                if ((payload as ResearchMessage).role === "finding") setPhase1DoneCount((c) => c + 1);
              }
              setCurrentMessages((prev) => [...prev, payload as ResearchMessage]);
            } else if (currentEvent === "final_answer" || ("content" in payload && !("agentId" in payload))) {
              setCurrentFinalAnswer(payload.content);
            } else if (currentEvent === "agent_tokens" || "inputTokens" in payload) {
              const t = { inputTokens: payload.inputTokens, outputTokens: payload.outputTokens, totalTokens: payload.totalTokens };
              roundTokens[payload.agentId] = t;
              setAgentTokens((prev) => ({ ...prev, [payload.agentId]: t }));
            } else if (currentEvent === "follow_up_suggestions" || "suggestions" in payload) {
              setCurrentSuggestions(payload.suggestions);
            } else if (currentEvent === "chart_data") {
              setCurrentChartData(payload);
            } else if (currentEvent === "clarification_needed") {
              setClarificationQuestions(payload.questions ?? []); setClarificationAnswers({}); setPendingClarification(true);
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
      if (e instanceof Error && e.name !== "AbortError") setStatus(`Error: ${e.message}`);
    } finally {
      setRunning(false);
      setSearchingAgents(new Set());
      setActiveAgentIds(new Set());
      setCurrentPhase(0);
      setPhase1DoneCount(0);
      if (currentMessagesRef.current.length > 0 || currentFinalAnswerRef.current) {
        setRounds((prev) => [
          ...prev,
          {
            question: closeMode ? "สรุปมติที่ประชุม" : q,
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
        setMeetingSessionId(null); meetingSessionIdRef.current = null;
        setMeetingStartTime(null); setElapsedTime(0);
        showToast("success", "ปิดประชุมแล้ว — สรุปมติพร้อม");
      }
      setCurrentMessages([]); setCurrentFinalAnswer(""); setCurrentSuggestions([]);
      setCurrentChartData(null); setCurrentWebSources([]); currentWebSourcesRef.current = [];
      setChairmanId(null);
      fetchServerHistory();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleClarificationSubmit = () => {
    const answers = clarificationQuestions.map((q) => ({ question: q.question, answer: clarificationAnswers[q.id] || "(ไม่ระบุ)" }));
    setPendingClarification(false); setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, answers);
  };

  const handleSkipClarification = () => {
    setPendingClarification(false); setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, []);
  };

  const handleCloseMeeting = () => handleRun(undefined, true);
  handleCloseRef.current = handleCloseMeeting;

  const handleSkipToSummary = () => {
    const hasData = currentMessagesRef.current.some((m) => ["finding", "chat", "analysis", "synthesis"].includes(m.role));
    if (!hasData && rounds.length === 0) { showToast("warning", "ยังไม่มีข้อมูลเพียงพอ"); return; }
    skipToSummaryRef.current = true;
    abortRef.current?.abort();
  };

  useEffect(() => {
    if (pendingSkipToSummary && !running && rounds.length > 0) {
      setPendingSkipToSummary(false);
      handleCloseMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSkipToSummary, running, rounds]);

  const handleStop = () => { abortRef.current?.abort(); setRunning(false); setStatus("Stopped"); };

  const loadServerSession = async (session: ServerSession) => {
    try {
      const res = await fetch(`/api/team-research/${session.id}`);
      const data = await res.json();
      if (data.session) setViewingSession(data.session);
    } catch { /* ignore */ }
  };

  const clearSession = () => {
    setRounds([]); setMeetingSessionId(null); meetingSessionIdRef.current = null;
    setCurrentMessages([]); setCurrentFinalAnswer(""); setCurrentSuggestions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleNewMeeting = () => {
    abortRef.current?.abort();
    clearSession();
    setQuestion("");
    setView("setup");
    setSetupStep(1);
    setViewingSession(null);
  };

  const exportMinutes = () => {
    let exportRounds: ConversationRound[];
    if (viewingSession) {
      exportRounds = [{
        question: viewingSession.question,
        messages: viewingSession.messages.map((m) => ({ ...m, timestamp: m.timestamp || new Date().toISOString() })),
        finalAnswer: viewingSession.finalAnswer || "",
        agentTokens: {}, suggestions: [],
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

  // Derive selected agents in order
  const selectedAgents = agents.filter((a) => selectedIds.has(a.id));

  // Last round's final answer (shown in synthesis panel when not running)
  const lastRoundAnswer = rounds.length > 0 ? rounds[rounds.length - 1]?.finalAnswer : "";

  const showSynthesis = Boolean(currentFinalAnswer || (!running && lastRoundAnswer));
  const synthesisFinalAnswer = currentFinalAnswer || lastRoundAnswer;
  const synthesisChartData = currentChartData ?? (rounds.length > 0 ? rounds[rounds.length - 1]?.chartData : undefined);
  const synthesisWebSources = currentWebSources.length > 0 ? currentWebSources : (rounds.length > 0 ? rounds[rounds.length - 1]?.webSources : undefined);

  // ─── Setup View ──────────────────────────────────────────────────────────────

  if (view === "setup") {
    return (
      <SetupModal
        agents={agents}
        selectedIds={selectedIds}
        onToggleAgent={toggleAgent}
        onSelectAll={handleSelectAll}
        question={question}
        onQuestionChange={setQuestion}
        historyMode={historyMode}
        onHistoryModeChange={(v) => setHistoryMode(v as "full" | "last3" | "summary" | "none")}
        useFileContext={useFileContext}
        onToggleFileContext={() => setUseFileContext((v) => !v)}
        useMcpContext={useMcpContext}
        onToggleMcp={() => setUseMcpContext((v) => !v)}
        attachedFiles={attachedFiles}
        uploadingFile={uploadingFile}
        uploadError={uploadError}
        isDragOver={isDragOver}
        fileInputRef={fileInputRef}
        onFileInput={handleFileInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onRemoveFile={(i) => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
        onToggleSheet={toggleSheet}
        onStart={() => handleRun()}
        setupStep={setupStep}
        onSetupStepChange={setSetupStep}
      />
    );
  }

  // ─── Room View ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--bg)", zIndex: 30 }}
    >
      {/* Top Bar */}
      <div
        className="h-12 flex items-center gap-3 px-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        {/* Left: Brand + Topic */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={handleNewMeeting}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
            title="New meeting"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline font-mono uppercase tracking-wide text-[10px]">Meeting</span>
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border)" }} />
          <div className="min-w-0 flex-1">
            <div className="text-xs truncate font-medium" style={{ color: "var(--text)" }}>
              {question || viewingSession?.question || "Untitled meeting"}
            </div>
            {companyName && (
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{companyName}</div>
            )}
          </div>
        </div>

        {/* Center: Phase stepper */}
        <PhaseStepper
          currentPhase={currentPhase}
          phase1DoneCount={phase1DoneCount}
          totalAgents={selectedIds.size}
        />

        {/* Right: Status + Timer + Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status && running && (
            <span className="text-[11px] font-mono hidden lg:block" style={{ color: "var(--text-muted)" }}>
              {status}
            </span>
          )}
          {meetingSessionId && elapsedTime > 0 && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px] flex-shrink-0"
              style={{ background: "var(--surface)", color: "var(--text-muted)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: running ? "var(--accent)" : "var(--text-muted)", animation: running ? "pulse 1.5s infinite" : "none" }}
              />
              <Clock size={10} />
              {formatTime(elapsedTime)}
            </div>
          )}

          {/* Mode badge */}
          <button
            onClick={() => setForceMode((prev) => prev === "auto" ? (effectiveMode === "qa" ? "meeting" : "qa") : "auto")}
            disabled={running}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded transition-opacity hover:opacity-70 hidden sm:flex items-center gap-1"
            style={{ background: "var(--surface)", color: "var(--text-muted)" }}
            title={effectiveMode === "qa" ? "QA mode" : "Meeting mode"}
          >
            {effectiveMode === "qa" ? <MessageSquare size={10} /> : <Building2 size={10} />}
            {effectiveMode === "qa" ? "QA" : "MTG"}
          </button>

          {/* Skip to summary */}
          {running && effectiveMode !== "qa" && (
            <button
              onClick={handleSkipToSummary}
              className="flex items-center gap-1 h-7 px-2 rounded text-xs border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              title="Skip to resolution"
            >
              <SkipForward size={11} />
              <span className="hidden md:inline">Skip</span>
            </button>
          )}

          {/* Stop */}
          {running && (
            <button
              onClick={handleStop}
              className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              title="Stop"
            >
              <Square size={11} />
            </button>
          )}

          {/* Close meeting */}
          {!running && rounds.length > 0 && meetingSessionId && effectiveMode !== "qa" && (
            <button
              onClick={handleCloseMeeting}
              className="h-7 px-3 rounded text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Conclude
            </button>
          )}

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          {/* History */}
          <button
            onClick={() => { setShowHistory((v) => !v); setShowSettings(false); }}
            className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: showHistory ? "var(--accent)" : "var(--text-muted)" }}
            title="History"
          >
            <History size={11} />
          </button>

          {/* Export */}
          <button
            onClick={exportMinutes}
            disabled={rounds.length === 0 && !viewingSession}
            className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            title="Export minutes"
          >
            <Download size={11} />
          </button>

          {/* Settings */}
          <button
            onClick={() => { setShowSettings((v) => !v); setShowHistory(false); }}
            className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: showSettings ? "var(--accent)" : "var(--text-muted)" }}
            title="Settings"
          >
            <Settings size={11} />
          </button>

          {/* Refresh agents */}
          <button
            onClick={fetchAgents}
            className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 gap-3 relative">

        {/* Viewing session banner */}
        {viewingSession && (
          <div
            className="flex items-center gap-3 px-3 py-2 rounded border flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <History size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs flex-1 truncate" style={{ color: "var(--text-muted)" }}>
              Viewing: {viewingSession.question}
            </span>
            <button
              onClick={() => setViewingSession(null)}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Session state bar */}
        {rounds.length > 0 && !viewingSession && (
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded border flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              {rounds.length} agenda{rounds.length !== 1 ? "s" : ""}
            </span>
            {(() => {
              const totalTk = rounds.reduce((s, r) => s + Object.values(r.agentTokens).reduce((a, t) => a + t.totalTokens, 0), 0);
              if (totalTk > 0) return (
                <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Coins size={10} /> {totalTk > 1000 ? `${(totalTk / 1000).toFixed(1)}k` : totalTk} tokens
                </span>
              );
              return null;
            })()}
            <div className="flex-1" />
          </div>
        )}

        {/* Agent grid */}
        <div className="flex-1 overflow-y-auto">
          {selectedAgents.length === 0 && !viewingSession ? (
            /* Empty state */
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs">
                <div className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No agents selected</div>
                <button
                  onClick={handleNewMeeting}
                  className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}
                >
                  Back to setup
                </button>
              </div>
            </div>
          ) : viewingSession ? (
            /* Session viewer */
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wide font-mono mb-2" style={{ color: "var(--text-muted)" }}>Messages</div>
                  {viewingSession.messages.filter((m) => m.role !== "thinking").map((msg, i) => (
                    <div key={i} className="mb-4 p-3 rounded border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                        <span className="text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>{ROLE_LABEL[msg.role] ?? msg.role}</span>
                      </div>
                      <MessageContent content={msg.content} />
                    </div>
                  ))}
                </div>
                {viewingSession.finalAnswer && (
                  <SynthesisPanel finalAnswer={viewingSession.finalAnswer} />
                )}
              </div>
            </div>
          ) : (
            /* Agent panels grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
              {selectedAgents.map((agent) => (
                <AgentPanel
                  key={agent.id}
                  agent={agent}
                  messages={agentMessageMap.get(agent.id) ?? []}
                  isChairman={agent.id === chairmanId}
                  isSearching={searchingAgents.has(agent.id)}
                  isActive={activeAgentIds.has(agent.id)}
                  tokens={agentTokens[agent.id]}
                  running={running}
                  isExpanded={expandedAgentId === agent.id}
                  onToggleExpand={() => setExpandedAgentId((prev) => prev === agent.id ? null : agent.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Synthesis panel */}
        {showSynthesis && synthesisFinalAnswer && !viewingSession && (
          <SynthesisPanel
            finalAnswer={synthesisFinalAnswer}
            chartData={synthesisChartData}
            webSources={synthesisWebSources}
          />
        )}

        {/* Suggestions */}
        {currentSuggestions.length > 0 && !running && (
          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
            {currentSuggestions.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(s); setTimeout(() => textareaRef.current?.focus(), 50); }}
                className="text-xs px-2.5 py-1 rounded border transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Clarification overlay */}
        {pendingClarification && clarificationQuestions.length > 0 && (
          <ClarificationOverlay
            questions={clarificationQuestions}
            answers={clarificationAnswers}
            onAnswer={(id, val) => setClarificationAnswers((prev) => ({ ...prev, [id]: val }))}
            onSubmit={handleClarificationSubmit}
            onSkip={handleSkipClarification}
          />
        )}
      </div>

      {/* Input bar */}
      {!viewingSession && (
        <div className="flex-shrink-0 px-3 pb-3" style={{ background: "var(--bg)" }}>
          <div
            className="border rounded-lg overflow-hidden transition-colors"
            style={{ borderColor: running ? "var(--accent)" : "var(--border)", background: "var(--card)" }}
          >
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleRun(); } }}
              disabled={running}
              rows={1}
              placeholder={
                effectiveMode === "qa"
                  ? "Ask a question..."
                  : meetingSessionId
                  ? "Continue with next agenda or conclude..."
                  : rounds.length > 0
                  ? "Add another agenda item..."
                  : "Start with the first agenda..."
              }
              className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-1"
              style={{ color: "var(--text)", minHeight: 36, maxHeight: 140 }}
            />
            <div className="flex items-center justify-between px-3 pb-2 gap-2">
              <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                <span>{selectedIds.size} members</span>
                {attachedFiles.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip size={10} /> {attachedFiles.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rounds.length > 0 && !running && meetingSessionId && effectiveMode !== "qa" && (
                  <button
                    onClick={handleCloseMeeting}
                    className="h-7 px-3 rounded text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    Conclude
                  </button>
                )}
                {running ? (
                  <button
                    onClick={handleStop}
                    className="w-7 h-7 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    <Square size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleRun()}
                    disabled={!question.trim() || selectedIds.size === 0}
                    className="h-7 px-3 rounded text-xs font-medium disabled:opacity-30 transition-opacity hover:opacity-80 flex items-center gap-1.5"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    <Send size={11} /> Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          historyMode={historyMode}
          onHistoryModeChange={(v) => setHistoryMode(v as "full" | "last3" | "summary" | "none")}
          useMcpContext={useMcpContext}
          onToggleMcp={() => setUseMcpContext((v) => !v)}
          useFileContext={useFileContext}
          onToggleFileContext={() => setUseFileContext((v) => !v)}
          attachedFiles={attachedFiles}
          uploadingFile={uploadingFile}
          uploadError={uploadError}
          isDragOver={isDragOver}
          fileInputRef={fileInputRef}
          onFileInput={handleFileInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onRemoveFile={(i) => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
          onToggleSheet={toggleSheet}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* History panel */}
      {showHistory && (
        <HistoryPanel
          rounds={rounds}
          serverSessions={serverSessions}
          viewingSession={viewingSession}
          onLoadSession={loadServerSession}
          onClearSession={clearSession}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
