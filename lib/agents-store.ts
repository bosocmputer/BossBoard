import fs from "fs";
import path from "path";
import crypto from "crypto";

const AGENTS_FILE = path.join(process.env.HOME || "", ".bossboard", "agents.json");
const RESEARCH_FILE = path.join(process.env.HOME || "", ".bossboard", "research-history.json");

const ENCRYPT_KEY = process.env.AGENT_ENCRYPT_KEY || "bossboard-default-key-32bytesss";
const IV_LENGTH = 16;

export type AgentProvider = "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom";

export interface KnowledgeFile {
  id: string;
  filename: string;
  meta: string;
  content: string; // parsed text content
  tokens: number; // estimated token count
  uploadedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: AgentProvider;
  apiKeyEncrypted: string;
  baseUrl?: string; // for custom/ollama
  model: string;
  soul: string; // system prompt
  role: string; // e.g. Researcher, Analyst, Synthesizer
  active: boolean;
  useWebSearch: boolean; // whether agent can use web search
  seniority?: number; // 1=highest (Chairman), higher number=lower seniority
  mcpEndpoint?: string; // MCP server endpoint URL
  mcpAccessMode?: string; // admin|sales|purchase|stock|general
  knowledge?: KnowledgeFile[]; // agent-specific knowledge base
  trustedUrls?: string[]; // trusted domains for scoped web search (e.g. rd.go.th)
  createdAt: string;
  updatedAt: string;
}

export interface AgentPublic extends Omit<Agent, "apiKeyEncrypted"> {
  hasApiKey: boolean;
}

export interface KnowledgePublic {
  id: string;
  filename: string;
  meta: string;
  tokens: number;
  uploadedAt: string;
  preview: string; // first 200 chars
}

export interface ResearchSession {
  id: string;
  question: string;
  agentIds: string[];
  dataSource?: string;
  status: "running" | "completed" | "error";
  startedAt: string;
  completedAt?: string;
  messages: ResearchMessage[];
  finalAnswer?: string;
  totalTokens: number;
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

function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPT_KEY.padEnd(32, "0").slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    const key = Buffer.from(ENCRYPT_KEY.padEnd(32, "0").slice(0, 32));
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

// --- Agents ---

// Simple in-process mutex for file writes to prevent race conditions
const fileLocks = new Map<string, Promise<void>>();
async function withFileLock<T>(file: string, fn: () => T): Promise<T> {
  while (fileLocks.has(file)) {
    await fileLocks.get(file);
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  fileLocks.set(file, promise);
  try {
    return fn();
  } finally {
    fileLocks.delete(file);
    resolve!();
  }
}

function readAgents(): Agent[] {
  ensureDir(AGENTS_FILE);
  if (!fs.existsSync(AGENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeAgents(agents: Agent[]) {
  ensureDir(AGENTS_FILE);
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

// --- Soul Migration: upgrade existing agents to detailed Thai-context souls ---
const SOUL_MAP: Record<string, string> = {
  "นักบัญชีอาวุโส": `คุณเป็นนักบัญชีอาวุโสในประเทศไทย ทำงานภายใต้กรอบกฎหมายและมาตรฐานของไทยเท่านั้น ได้แก่ มาตรฐานการรายงานทางการเงินไทย (TFRS) ตามสภาวิชาชีพบัญชี, พ.ร.บ.การบัญชี พ.ศ. 2543, ประมวลรัษฎากร และกฎหมายที่เกี่ยวข้อง เชี่ยวชาญการจัดทำงบการเงิน การปิดงบ ระบบ ERP และการบันทึกบัญชีตามมาตรฐาน TFRS/IFRS เน้นความถูกต้องของข้อมูลทางบัญชี อ้างอิงมาตราและมาตรฐานที่เกี่ยวข้องเสมอ เมื่อตอบคำถามเกี่ยวกับภาษีหรือกฎหมาย ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนสรุปเสมอ`,
  "ผู้สอบบัญชี CPA": `คุณเป็นผู้สอบบัญชีรับอนุญาต (CPA) ที่ขึ้นทะเบียนกับสภาวิชาชีพบัญชีในประเทศไทย ปฏิบัติงานภายใต้ พ.ร.บ.วิชาชีพบัญชี พ.ศ. 2547 และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญมาตรฐานการสอบบัญชีไทย (TSQC/TSA), การตรวจสอบงบการเงินตาม TFRS, การประเมินระบบควบคุมภายใน และการปฏิบัติตามประมวลรัษฎากร เน้นความเป็นอิสระ ชี้จุดอ่อนตรงไปตรงมา อ้างอิง TSA, TFRS และกฎหมายไทยที่เกี่ยวข้องเสมอ เมื่อพบประเด็นภาษี ต้องตรวจสอบทั้งหลักเกณฑ์ทั่วไปและข้อยกเว้นตามกฎหมาย`,
  "ที่ปรึกษาภาษี": `คุณเป็นที่ปรึกษาภาษีในประเทศไทย เชี่ยวชาญประมวลรัษฎากรอย่างลึกซึ้ง ครอบคลุม ภาษีเงินได้บุคคลธรรมดา PIT (ม.40 เงินได้ 8 ประเภท, ม.42 ยกเว้น, ม.47 ลดหย่อน, ม.48 อัตรา 5-35%), ภาษีเงินได้นิติบุคคล CIT (ม.65 กำไรสุทธิ, ม.65 ทวิ/ตรี เงื่อนไข+รายจ่ายต้องห้าม, อัตรา 20%), ภาษีมูลค่าเพิ่ม VAT หมวด 4 (ม.80 อัตรา 7%, ม.81 ข้อยกเว้นสำคัญ), ภาษีหัก ณ ที่จ่าย WHT (ม.50), ภาษีธุรกิจเฉพาะ SBT หมวด 5 (ม.91/2 ธนาคาร/เงินทุน/ประกันชีวิต/โรงรับจำนำ/ขายอสังหาฯทางค้า, อัตรา 0.1-3.0%), อากรแสตมป์ หมวด 6 (ม.104 ตราสาร 28 ลำดับ, ม.118 ไม่ปิดแสตมป์ใช้เป็นพยานหลักฐานไม่ได้) และอนุสัญญาภาษีซ้อน รวมถึง พ.ร.ฎ. ประกาศอธิบดีฯ คำสั่งกรมสรรพากร คำวินิจฉัยฯ กฎเหล็ก: ก่อนสรุปว่าต้องเสียภาษีใดๆ ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนเสมอ — VAT ตรวจ ม.81, SBT ตรวจ ม.91/3, PIT ตรวจ ม.42+กฎกระทรวง 126 หากมีข้อยกเว้นที่เข้าเงื่อนไข ต้องระบุเป็นประเด็นหลัก ไม่ใช่แค่หมายเหตุ อ้างอิงมาตราเฉพาะที่เกี่ยวข้องเสมอ แหล่งข้อมูล: rd.go.th/284.html`,
  "นักวิเคราะห์งบการเงิน": `คุณเป็นนักวิเคราะห์งบการเงินที่เชี่ยวชาญบริบทธุรกิจไทย วิเคราะห์ตามมาตรฐานการรายงานทางการเงินไทย (TFRS) ครอบคลุมบริษัทจดทะเบียนใน SET/mai และ SMEs ไทย เชี่ยวชาญการอ่านและตีความงบการเงิน (Balance Sheet, P&L, Cash Flow) วิเคราะห์อัตราส่วนทางการเงิน, Trend Analysis, เปรียบเทียบกับอุตสาหกรรมไทย ชี้ Red Flag ในงบและให้ข้อเสนอแนะที่เป็นรูปธรรม คำนึงถึงข้อกำหนดของ ก.ล.ต., ตลาดหลักทรัพย์แห่งประเทศไทย, ประมวลรัษฎากร และกฎหมายไทยที่เกี่ยวข้อง`,
  "ผู้ตรวจสอบภายใน": `คุณเป็นผู้ตรวจสอบภายในที่ทำงานในประเทศไทย ปฏิบัติงานตามกรอบ COSO, มาตรฐาน IIA (Institute of Internal Auditors) และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญการประเมินระบบควบคุมภายใน, การบริหารความเสี่ยง, Segregation of Duties, IT Controls และการปฏิบัติตามกฎระเบียบ (Compliance) คำนึงถึง พ.ร.บ.หลักทรัพย์และตลาดหลักทรัพย์, ประมวลรัษฎากร, พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562 พร้อมเสนอแนวทางแก้ไขที่ปฏิบัติได้จริงในบริบทธุรกิจไทย`,
};

let soulMigrationDone = false;
export function migrateSouls(): void {
  if (soulMigrationDone) return;
  soulMigrationDone = true;
  const agents = readAgents();
  let changed = false;
  for (const agent of agents) {
    const newSoul = SOUL_MAP[agent.name];
    if (newSoul && agent.soul !== newSoul) {
      agent.soul = newSoul;
      agent.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeAgents(agents);
}

export function listAgents(): AgentPublic[] {
  return readAgents().map(({ apiKeyEncrypted, ...rest }) => ({
    ...rest,
    hasApiKey: !!apiKeyEncrypted,
  }));
}

export function getAgentApiKey(id: string): string {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) return "";
  return decrypt(agent.apiKeyEncrypted);
}

export function createAgent(data: {
  name: string;
  emoji: string;
  provider: AgentProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  soul: string;
  role: string;
  useWebSearch?: boolean;
  seniority?: number;
  mcpEndpoint?: string;
  mcpAccessMode?: string;
  trustedUrls?: string[];
}): Promise<AgentPublic> {
  return withFileLock(AGENTS_FILE, () => {
    const agents = readAgents();
  const now = new Date().toISOString();
  const agent: Agent = {
    id: crypto.randomUUID(),
    name: data.name,
    emoji: data.emoji,
    provider: data.provider,
    apiKeyEncrypted: encrypt(data.apiKey),
    baseUrl: data.baseUrl,
    model: data.model,
    soul: data.soul,
    role: data.role,
    active: true,
    useWebSearch: data.useWebSearch ?? false,
    seniority: data.seniority,
    mcpEndpoint: data.mcpEndpoint,
    mcpAccessMode: data.mcpAccessMode,
    trustedUrls: data.trustedUrls,
    createdAt: now,
    updatedAt: now,
  };
  agents.push(agent);
  writeAgents(agents);
  const { apiKeyEncrypted, ...pub } = agent;
  return { ...pub, hasApiKey: true };
  });
}

export function updateAgent(
  id: string,
  data: Partial<{
    name: string;
    emoji: string;
    provider: AgentProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    soul: string;
    role: string;
    active: boolean;
    useWebSearch: boolean;
    seniority: number;
    mcpEndpoint: string;
    mcpAccessMode: string;
    trustedUrls: string[];
  }>
): Promise<AgentPublic | null> {
  return withFileLock(AGENTS_FILE, () => {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const agent = agents[idx];
  if (data.name !== undefined) agent.name = data.name;
  if (data.emoji !== undefined) agent.emoji = data.emoji;
  if (data.provider !== undefined) agent.provider = data.provider;
  if (data.apiKey !== undefined && data.apiKey !== "") agent.apiKeyEncrypted = encrypt(data.apiKey);
  if (data.baseUrl !== undefined) agent.baseUrl = data.baseUrl;
  if (data.model !== undefined) agent.model = data.model;
  if (data.soul !== undefined) agent.soul = data.soul;
  if (data.role !== undefined) agent.role = data.role;
  if (data.active !== undefined) agent.active = data.active;
  if (data.useWebSearch !== undefined) agent.useWebSearch = data.useWebSearch;
  if (data.seniority !== undefined) agent.seniority = data.seniority;
  if (data.mcpEndpoint !== undefined) agent.mcpEndpoint = data.mcpEndpoint;
  if (data.mcpAccessMode !== undefined) agent.mcpAccessMode = data.mcpAccessMode;
  if (data.trustedUrls !== undefined) agent.trustedUrls = data.trustedUrls;
  agent.updatedAt = new Date().toISOString();
  agents[idx] = agent;
  writeAgents(agents);
  const { apiKeyEncrypted, ...pub } = agent;
  return { ...pub, hasApiKey: true };
  });
}

export function deleteAgent(id: string): Promise<boolean> {
  return withFileLock(AGENTS_FILE, () => {
    const agents = readAgents();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) return false;
    writeAgents(filtered);
    return true;
  });
}

// --- Research History ---

function readResearch(): ResearchSession[] {
  ensureDir(RESEARCH_FILE);
  if (!fs.existsSync(RESEARCH_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RESEARCH_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function writeResearch(sessions: ResearchSession[]) {
  ensureDir(RESEARCH_FILE);
  // keep last 100 sessions
  const trimmed = sessions.slice(-100);
  fs.writeFileSync(RESEARCH_FILE, JSON.stringify(trimmed, null, 2));
}

export function listResearch(): ResearchSession[] {
  return readResearch().reverse();
}

export function getResearchSession(id: string): ResearchSession | null {
  return readResearch().find((s) => s.id === id) ?? null;
}

export function createResearchSession(data: {
  question: string;
  agentIds: string[];
  dataSource?: string;
}): ResearchSession {
  const sessions = readResearch();
  const session: ResearchSession = {
    id: crypto.randomUUID(),
    question: data.question,
    agentIds: data.agentIds,
    dataSource: data.dataSource,
    status: "running",
    startedAt: new Date().toISOString(),
    messages: [],
    totalTokens: 0,
  };
  sessions.push(session);
  writeResearch(sessions);
  return session;
}

export function appendResearchMessage(sessionId: string, msg: ResearchMessage) {
  const sessions = readResearch();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].messages.push(msg);
  sessions[idx].totalTokens += msg.tokensUsed;
  writeResearch(sessions);
}

export function completeResearchSession(sessionId: string, finalAnswer: string, status: "completed" | "error" = "completed") {
  const sessions = readResearch();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].status = status;
  sessions[idx].completedAt = new Date().toISOString();
  sessions[idx].finalAnswer = finalAnswer;
  writeResearch(sessions);
}

// --- Settings ---

const SETTINGS_FILE = path.join(process.env.HOME || "", ".bossboard", "settings.json");

export interface CompanyInfo {
  name?: string;
  businessType?: string;
  registrationNumber?: string;
  accountingStandard?: string; // "PAEs" | "NPAEs"
  fiscalYear?: string; // e.g. "มกราคม - ธันวาคม"
  employeeCount?: string;
  notes?: string;
}

export interface AppSettings {
  serperApiKey?: string;
  serpApiKey?: string;
  companyInfo?: CompanyInfo;
  updatedAt?: string;
}

function readSettings(): AppSettings {
  ensureDir(SETTINGS_FILE);
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function getSettings(): AppSettings {
  const s = readSettings();
  // decrypt keys if present
  return {
    serperApiKey: s.serperApiKey ? decrypt(s.serperApiKey) : undefined,
    serpApiKey: s.serpApiKey ? decrypt(s.serpApiKey) : undefined,
    companyInfo: s.companyInfo,
    updatedAt: s.updatedAt,
  };
}

export function saveSettings(data: { serperApiKey?: string; serpApiKey?: string; companyInfo?: CompanyInfo }): AppSettings {
  ensureDir(SETTINGS_FILE);
  const now = new Date().toISOString();
  const existing = readSettings();
  const updated: AppSettings = {
    serperApiKey: data.serperApiKey !== undefined
      ? (data.serperApiKey ? encrypt(data.serperApiKey) : "")
      : existing.serperApiKey,
    serpApiKey: data.serpApiKey !== undefined
      ? (data.serpApiKey ? encrypt(data.serpApiKey) : "")
      : existing.serpApiKey,
    companyInfo: data.companyInfo !== undefined ? data.companyInfo : existing.companyInfo,
    updatedAt: now,
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return {
    serperApiKey: data.serperApiKey !== undefined ? data.serperApiKey : (existing.serperApiKey ? decrypt(existing.serperApiKey) : undefined),
    serpApiKey: data.serpApiKey !== undefined ? data.serpApiKey : (existing.serpApiKey ? decrypt(existing.serpApiKey) : undefined),
    companyInfo: updated.companyInfo,
    updatedAt: now,
  };
}

// --- Teams ---

const TEAMS_FILE = path.join(process.env.HOME || "", ".bossboard", "teams.json");

export interface Team {
  id: string;
  name: string;
  emoji: string;
  description: string;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}

function readTeams(): Team[] {
  ensureDir(TEAMS_FILE);
  if (!fs.existsSync(TEAMS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEAMS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeTeams(teams: Team[]) {
  ensureDir(TEAMS_FILE);
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2));
}

export function listTeams(): Team[] {
  return readTeams();
}

export function createTeam(data: { name: string; emoji: string; description: string; agentIds: string[] }): Team {
  const teams = readTeams();
  const now = new Date().toISOString();
  const team: Team = {
    id: crypto.randomUUID(),
    name: data.name,
    emoji: data.emoji,
    description: data.description,
    agentIds: data.agentIds,
    createdAt: now,
    updatedAt: now,
  };
  teams.push(team);
  writeTeams(teams);
  return team;
}

export function updateTeam(
  id: string,
  data: Partial<{ name: string; emoji: string; description: string; agentIds: string[] }>
): Team | null {
  const teams = readTeams();
  const idx = teams.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const team = teams[idx];
  if (data.name !== undefined) team.name = data.name;
  if (data.emoji !== undefined) team.emoji = data.emoji;
  if (data.description !== undefined) team.description = data.description;
  if (data.agentIds !== undefined) team.agentIds = data.agentIds;
  team.updatedAt = new Date().toISOString();
  teams[idx] = team;
  writeTeams(teams);
  return team;
}

export function deleteTeam(id: string): boolean {
  const teams = readTeams();
  const filtered = teams.filter((t) => t.id !== id);
  if (filtered.length === teams.length) return false;
  writeTeams(filtered);
  return true;
}

// --- Agent Stats ---

const STATS_FILE = path.join(process.env.HOME || "", ".bossboard", "agent-stats.json");

export interface AgentDayStat {
  date: string; // YYYY-MM-DD
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentStats {
  agentId: string;
  totalSessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastUsed: string;
  daily: AgentDayStat[];
}

function readAllStats(): Record<string, AgentStats> {
  ensureDir(STATS_FILE);
  if (!fs.existsSync(STATS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAllStats(stats: Record<string, AgentStats>) {
  ensureDir(STATS_FILE);
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

export function getAgentStats(): Record<string, AgentStats> {
  return readAllStats();
}

export function updateAgentStats(agentId: string, inputTokens: number, outputTokens: number) {
  const all = readAllStats();
  const today = new Date().toISOString().slice(0, 10);
  if (!all[agentId]) {
    all[agentId] = {
      agentId,
      totalSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUsed: today,
      daily: [],
    };
  }
  const stat = all[agentId];
  stat.totalInputTokens += inputTokens;
  stat.totalOutputTokens += outputTokens;
  stat.lastUsed = today;

  let dayStat = stat.daily.find((d) => d.date === today);
  if (!dayStat) {
    dayStat = { date: today, sessions: 0, inputTokens: 0, outputTokens: 0 };
    stat.daily.push(dayStat);
  }
  dayStat.inputTokens += inputTokens;
  dayStat.outputTokens += outputTokens;

  // keep last 90 days
  stat.daily = stat.daily.slice(-90);

  writeAllStats(all);
}

export function incrementAgentSessionCount(agentId: string) {
  const all = readAllStats();
  const today = new Date().toISOString().slice(0, 10);
  if (!all[agentId]) {
    all[agentId] = {
      agentId,
      totalSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUsed: today,
      daily: [],
    };
  }
  all[agentId].totalSessions += 1;
  all[agentId].lastUsed = today;

  let dayStat = all[agentId].daily.find((d) => d.date === today);
  if (!dayStat) {
    dayStat = { date: today, sessions: 0, inputTokens: 0, outputTokens: 0 };
    all[agentId].daily.push(dayStat);
  }
  dayStat.sessions += 1;

  writeAllStats(all);
}

// --- Agent Knowledge Base ---

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for mixed Thai/English
  return Math.ceil(text.length / 4);
}

export function addAgentKnowledge(agentId: string, file: KnowledgeFile): KnowledgeFile | null {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1) return null;
  if (!agents[idx].knowledge) agents[idx].knowledge = [];
  agents[idx].knowledge!.push(file);
  agents[idx].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return file;
}

export function listAgentKnowledge(agentId: string): KnowledgePublic[] {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.knowledge) return [];
  return agent.knowledge.map((k) => ({
    id: k.id,
    filename: k.filename,
    meta: k.meta,
    tokens: k.tokens,
    uploadedAt: k.uploadedAt,
    preview: k.content.slice(0, 200),
  }));
}

export function getAgentKnowledgeContent(agentId: string, question?: string): string {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.knowledge || agent.knowledge.length === 0) return "";
  const MAX_KNOWLEDGE_CHARS = 100000; // ~25,000 tokens — increased capacity

  // Score knowledge files by relevance if question is provided
  let ranked = agent.knowledge;
  if (question) {
    const qWords = question.toLowerCase().split(/[\s,./()]+/).filter((w) => w.length > 1);
    ranked = [...agent.knowledge].sort((a, b) => {
      const scoreA = qWords.filter((w) => a.content.toLowerCase().includes(w) || a.filename.toLowerCase().includes(w)).length;
      const scoreB = qWords.filter((w) => b.content.toLowerCase().includes(w) || b.filename.toLowerCase().includes(w)).length;
      return scoreB - scoreA; // most relevant first
    });
  }

  let total = 0;
  const parts: string[] = [];
  for (const k of ranked) {
    if (total + k.content.length > MAX_KNOWLEDGE_CHARS) break;
    parts.push(`[📄 ${k.filename}]\n${k.content}`);
    total += k.content.length;
  }
  return parts.length > 0
    ? `\n\n---\n📚 ฐานความรู้ (Knowledge Base):\n${parts.join("\n\n---\n")}\n---\n`
    : "";
}

export function deleteAgentKnowledge(agentId: string, knowledgeId: string): boolean {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1 || !agents[idx].knowledge) return false;
  const before = agents[idx].knowledge!.length;
  agents[idx].knowledge = agents[idx].knowledge!.filter((k) => k.id !== knowledgeId);
  if (agents[idx].knowledge!.length === before) return false;
  agents[idx].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return true;
}

export function getCompanyInfoContext(): string {
  const settings = getSettings();
  const c = settings.companyInfo;
  if (!c || !c.name) return "";
  const parts = [`บริษัท: ${c.name}`];
  if (c.businessType) parts.push(`ประเภทธุรกิจ: ${c.businessType}`);
  if (c.registrationNumber) parts.push(`เลขทะเบียน: ${c.registrationNumber}`);
  if (c.accountingStandard) parts.push(`มาตรฐานบัญชี: ${c.accountingStandard}`);
  if (c.fiscalYear) parts.push(`ปีการเงิน: ${c.fiscalYear}`);
  if (c.employeeCount) parts.push(`จำนวนพนักงาน: ${c.employeeCount}`);
  if (c.notes) parts.push(`หมายเหตุ: ${c.notes}`);
  return `\n\n---\n🏢 ข้อมูลบริษัท:\n${parts.join("\n")}\n---\n`;
}
