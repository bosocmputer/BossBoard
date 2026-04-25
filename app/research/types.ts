export interface Agent {
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
  isSystem?: boolean;
}

export interface ResearchMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  role: "thinking" | "finding" | "analysis" | "synthesis" | "chat";
  content: string;
  tokensUsed: number;
  timestamp: string;
}

export interface AgentTokenState {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export interface SynthesisMetadata {
  riskLevel?: "low" | "medium" | "high";
  actionItems?: string[];
  legalRefs?: string[];
  deadlines?: string[];
}

export interface ConversationRound {
  question: string;
  messages: ResearchMessage[];
  finalAnswer: string;
  agentTokens: Record<string, AgentTokenState>;
  suggestions: string[];
  chartData?: ChartData;
  synthMeta?: SynthesisMetadata;
  chairmanId?: string;
  isSynthesis?: boolean;
  isQA?: boolean;
  webSources?: WebSource[];
  clarificationAnswers?: { question: string; answer: string }[];
}

export interface ConversationTurn {
  question: string;
  answer: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

export interface MidMeetingQuestion {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  questionId: string;
  question: string;
  context: string;
}

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface ServerSession {
  id: string;
  question: string;
  agentIds?: string[];
  status: string;
  startedAt: string;
  totalTokens: number;
  messages: ResearchMessage[];
  finalAnswer?: string;
  ownerUsername?: string;
}

export interface AttachedFile {
  filename: string;
  meta: string;
  context: string;
  chars: number;
  size: number;
  sheets?: string[];
  selectedSheets?: string[];
}

export const SUPPORTED_EXTENSIONS = [
  ".xlsx", ".xls", ".xlsm",
  ".pdf",
  ".docx", ".doc",
  ".csv",
  ".json",
  ".txt", ".md", ".log",
];

export const STORAGE_KEY_PREFIX = "research_conversation_v2";

export const ROLE_LABEL: Record<string, string> = {
  thinking: "กำลังคิด",
  finding: "นำเสนอ",
  analysis: "วิเคราะห์",
  synthesis: "มติประธาน",
  chat: "อภิปราย",
};

export const ROLE_COLOR: Record<string, string> = {
  thinking: "border-yellow-500/30 bg-yellow-500/5",
  finding: "border-blue-500/30 bg-blue-500/5",
  analysis: "border-green-500/30 bg-green-500/5",
  synthesis: "border-purple-500/40 bg-purple-500/10 ring-1 ring-purple-500/20",
  chat: "border-slate-400/40 bg-slate-500/8",
};

export const HISTORY_MODES = [
  { id: "full", label: "จำทั้งหมด — จำทุกรอบ" },
  { id: "last3", label: "จำ 3 รอบล่าสุด" },
  { id: "summary", label: "สรุปย่อ (ประหยัด)" },
  { id: "none", label: "ไม่จำ (ประหยัดสุด)" },
];

export const MEETING_TEMPLATES = [
  "ธุรกิจของฉันควรจด VAT ไหม? ขอเกณฑ์และขั้นตอน",
  "วางแผนภาษีนิติบุคคลสิ้นปีอย่างไรดี? ประเด็นที่ต้องเตรียม",
  "การจ่ายค่าบริการให้บุคคลธรรมดาต้องหัก ณ ที่จ่ายอย่างไร?",
  "ประเด็นที่ต้องระวังในการตรวจสอบงบการเงินประจำปี",
  "ขั้นตอนการย้ายที่อยู่จด VAT และแจ้งกรมสรรพากร",
];
