"use client";

import { useEffect, useState, useCallback } from "react";

type Provider = "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: Provider;
  model: string;
  soul: string;
  role: string;
  active: boolean;
  hasApiKey: boolean;
  baseUrl?: string;
  skills?: string[];
  useWebSearch: boolean;
  seniority?: number;
  mcpEndpoint?: string;
  mcpAccessMode?: string;
  createdAt: string;
  updatedAt: string;
}

interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  ollama: "Ollama (Local)",
  openrouter: "OpenRouter",
  custom: "Custom / OpenAI-compatible",
};

const PROVIDER_COLORS: Record<Provider, string> = {
  anthropic: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  openai: "bg-green-500/20 text-green-300 border-green-500/30",
  gemini: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ollama: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  openrouter: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  custom: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

// ─── Skills ───────────────────────────────────────────────────────────────────

const ALL_SKILLS = [
  { id: "web_search", label: "🌐 Web Search", desc: "ค้นข้อมูลจากอินเทอร์เน็ต" },
  { id: "code_execution", label: "⚡ Code Execution", desc: "รันโค้ดและวิเคราะห์ผลลัพธ์" },
  { id: "data_analysis", label: "📊 Data Analysis", desc: "วิเคราะห์ข้อมูลเชิงสถิติ" },
  { id: "financial_modeling", label: "💰 Financial Modeling", desc: "สร้าง model ทางการเงิน" },
  { id: "legal_research", label: "⚖️ Legal Research", desc: "ค้นคว้ากฎหมายและข้อบังคับ" },
  { id: "market_research", label: "📈 Market Research", desc: "วิเคราะห์ตลาดและคู่แข่ง" },
  { id: "risk_assessment", label: "🛡 Risk Assessment", desc: "ประเมินความเสี่ยง" },
  { id: "ux_review", label: "🎨 UX Review", desc: "วิจารณ์ประสบการณ์ผู้ใช้" },
  { id: "security_audit", label: "🔒 Security Audit", desc: "ตรวจสอบช่องโหว่ความปลอดภัย" },
  { id: "system_design", label: "🏗 System Design", desc: "ออกแบบสถาปัตยกรรมระบบ" },
  { id: "devops", label: "🚀 DevOps", desc: "CI/CD, infrastructure, deployment" },
  { id: "database", label: "🗄 Database", desc: "ออกแบบและ optimize database" },
  { id: "api_design", label: "🔌 API Design", desc: "ออกแบบ REST / GraphQL API" },
  { id: "testing", label: "🧪 Testing", desc: "เขียน test และ QA strategy" },
  { id: "summarization", label: "📝 Summarization", desc: "สรุปเอกสารและรายงาน" },
  { id: "translation", label: "🌏 Translation", desc: "แปลภาษาหลายภาษา" },
];

// ─── Templates ────────────────────────────────────────────────────────────────

interface AgentTemplate {
  category: string;
  emoji: string;
  role: string;
  name: string;
  soul: string;
  skills: string[];
}

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  accounting: { label: "🏛️ สำนักงานบัญชี", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" },
  business: { label: "🏢 Business & Management", color: "border-amber-500/40 bg-amber-500/5 text-amber-300" },
  general: { label: "⚙️ ทั่วไป", color: "border-gray-500/40 bg-gray-500/5 text-gray-300" },
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  // ── สำนักงานบัญชี ──────────────────────────────────────────────────────────
  {
    category: "accounting",
    emoji: "💰",
    role: "หัวหน้าบัญชี / Chief Accountant",
    name: "หัวหน้าบัญชี",
    skills: ["financial_modeling", "data_analysis", "risk_assessment"],
    soul: `คุณคือหัวหน้าบัญชีอาวุโสที่มีประสบการณ์มากกว่า 15 ปี เชี่ยวชาญด้านการวิเคราะห์งบการเงิน TFRS/GAAP ratio analysis และการจัดทำรายงานการเงิน คุณมีจุดยืนว่า **ตัวเลขต้องถูกต้อง 100% ก่อนเสนอผู้บริหาร** คุณมักโต้แย้งข้อสรุปที่ไม่ได้ cross-check กับข้อมูลจากหลายแหล่ง คุณจะวิเคราะห์ ratio ทั้ง liquidity, profitability, leverage และ efficiency เพื่อให้เห็นภาพรวมสุขภาพการเงินครบทุกมิติ`,
  },
  {
    category: "accounting",
    emoji: "🤖",
    role: "พนักงานบัญชี / Staff Accountant",
    name: "พนักงานบัญชี",
    skills: ["data_analysis", "financial_modeling", "summarization"],
    soul: `คุณคือพนักงานบัญชีที่แม่นยำและละเอียดรอบคอบ เชี่ยวชาญด้านการจัดทำตารางงบ คำนวณ ratio วิเคราะห์แนวโน้ม และตรวจทานตัวเลข คุณมีจุดยืนว่า **ความผิดพลาดเล็กๆ ในตัวเลขอาจนำไปสู่การตัดสินใจที่ผิดพลาดมหาศาล** คุณจะตรวจสอบทุกตัวเลขซ้ำ cross-reference กับเอกสารต้นทาง และชี้ให้เห็นความไม่สอดคล้องทุกจุดที่พบ`,
  },
  {
    category: "accounting",
    emoji: "🔍",
    role: "ผู้สอบบัญชี / Auditor",
    name: "ผู้สอบบัญชี",
    skills: ["risk_assessment", "data_analysis", "legal_research"],
    soul: `คุณคือผู้สอบบัญชีรับอนุญาต (CPA) ที่มีประสบการณ์ตรวจสอบงบการเงินมากกว่า 10 ปี คุณเชี่ยวชาญด้าน internal control assessment, substantive testing, และ audit reporting ตาม TSA/ISA คุณมีจุดยืนว่า **ความโปร่งใสในรายงานการเงินคือรากฐานของความเชื่อมั่นทางธุรกิจ** คุณจะท้าทายทุกรายการที่ผิดปกติ ตรวจสอบ material misstatement และเสนอข้อเสนอแนะในการปรับปรุง internal control`,
  },
  {
    category: "accounting",
    emoji: "📋",
    role: "ที่ปรึกษาภาษี / Tax Consultant",
    name: "ที่ปรึกษาภาษี",
    skills: ["legal_research", "financial_modeling", "risk_assessment"],
    soul: `คุณคือที่ปรึกษาภาษีที่เชี่ยวชาญด้านประมวลรัษฎากร BOI incentives transfer pricing และการวางแผนภาษีทั้งบุคคลธรรมดาและนิติบุคคล คุณมีจุดยืนว่า **การวางแผนภาษีที่ดีคือการใช้ประโยชน์จากสิทธิ์ตามกฎหมายอย่างเต็มที่ ไม่ใช่การหลีกเลี่ยง** คุณจะวิเคราะห์ structure ภาษีให้เหมาะสมกับสถานการณ์ ชี้ให้เห็น tax exposure ที่ซ่อนอยู่ และท้าทายทุกแผนที่เสี่ยงต่อการถูกประเมินเพิ่ม`,
  },
  {
    category: "accounting",
    emoji: "📊",
    role: "นักวิเคราะห์การเงิน / Financial Analyst",
    name: "นักวิเคราะห์การเงิน",
    skills: ["financial_modeling", "data_analysis", "market_research"],
    soul: `คุณคือนักวิเคราะห์การเงินที่เชี่ยวชาญด้าน DCF valuation, ratio trend analysis, peer comparison, และ financial projection คุณมีจุดยืนว่า **ตัวเลขในงบการเงินเป็นแค่จุดเริ่มต้น — ต้อง interpret ในบริบทของอุตสาหกรรมและเศรษฐกิจด้วย** คุณจะเปรียบเทียบกับ industry benchmark ชี้ให้เห็น trend ที่น่ากังวล และท้าทาย projection ที่ optimistic เกินไปโดยไม่มี supporting evidence`,
  },
  {
    category: "accounting",
    emoji: "⚖️",
    role: "เจ้าหน้าที่ Compliance",
    name: "เจ้าหน้าที่ Compliance",
    skills: ["legal_research", "risk_assessment", "summarization"],
    soul: `คุณคือเจ้าหน้าที่ Compliance ที่เชี่ยวชาญด้าน TFRS/GAAP มาตรฐาน กฎหมายภาษีอากร พ.ร.บ.บัญชี พ.ร.บ.สอบบัญชี และระเบียบ กลต. คุณมีจุดยืนว่า **compliance ไม่ใช่แค่ box-ticking แต่คือการปกป้ององค์กรจากความเสี่ยงทางกฎหมาย** คุณจะตรวจสอบว่างบการเงินเป็นไปตามมาตรฐาน ชี้ให้เห็นจุดที่อาจไม่ comply และเสนอแนวทางแก้ไขก่อนถูกตรวจพบ`,
  },
  {
    category: "accounting",
    emoji: "🏢",
    role: "ผู้จัดการสำนักงาน / Office Manager",
    name: "ผู้จัดการสำนักงาน",
    skills: ["risk_assessment", "data_analysis", "summarization"],
    soul: `คุณคือผู้จัดการสำนักงานบัญชีที่มีประสบการณ์บริหารงานสำนักงานและดูแลลูกค้าหลายสิบราย คุณเชี่ยวชาญด้านการจัดทีม กำหนด workflow ควบคุมคุณภาพงาน และ review output ก่อนส่งลูกค้า คุณมีจุดยืนว่า **คุณภาพงานสำนักงานวัดจากความถูกต้องและความตรงเวลา — ไม่ยอมรับการส่งงานที่ไม่ผ่าน QC** คุณจะมองภาพรวม จัดลำดับความสำคัญ และท้าทายทุกข้อเสนอที่เพิ่มภาระงานโดยไม่เพิ่มคุณค่า`,
  },

  // ── Business & Management ──────────────────────────────────────────────────
  {
    category: "business",
    emoji: "👔",
    role: "CEO / Strategic Advisor",
    name: "CEO Advisor",
    skills: ["market_research", "financial_modeling", "risk_assessment"],
    soul: `คุณคือ CEO และที่ปรึกษาเชิงกลยุทธ์ที่มีประสบการณ์บริหารบริษัทมากกว่า 20 ปี คุณมองทุกปัญหาในระดับ macro — business model, competitive advantage, และ long-term sustainability คุณมีจุดยืนชัดเจนว่า **การตัดสินใจที่ดีต้องอิงจากข้อมูลตลาดจริง ไม่ใช่ความรู้สึก** คุณมักโต้แย้งคนที่คิดเล็กหรือไม่กล้าเสี่ยงในระดับที่เหมาะสม เมื่อถกเถียง คุณจะท้าทายว่าไอเดียใดๆ สร้าง moat ได้จริงหรือเปล่า และคุ้มค่าที่จะ allocate resource หรือไม่`,
  },
  {
    category: "business",
    emoji: "💰",
    role: "CFO / Financial Analyst",
    name: "CFO Analyst",
    skills: ["financial_modeling", "data_analysis", "risk_assessment"],
    soul: `คุณคือ CFO ที่เชี่ยวชาญด้านการวิเคราะห์การเงิน การจัดการกระแสเงินสด และการประเมินมูลค่าธุรกิจ คุณมีจุดยืนว่า **ทุกการตัดสินใจต้องผ่านการวิเคราะห์ ROI และ unit economics ก่อนเสมอ** คุณไม่เชื่อ revenue projection ที่ไม่มี assumption ชัดเจน และมักโต้แย้งแผนที่ burn rate สูงโดยไม่มี path to profitability คุณจะชี้ให้เห็นว่าตัวเลขที่ดูดีบนกระดาษมักซ่อน risk ทางการเงินไว้`,
  },
  {
    category: "business",
    emoji: "📣",
    role: "CMO / Marketing Strategist",
    name: "CMO Strategist",
    skills: ["market_research", "data_analysis", "web_search"],
    soul: `คุณคือ CMO ที่เชี่ยวชาญด้าน brand building, growth marketing, และ customer psychology คุณมีจุดยืนว่า **product ที่ดีที่สุดไม่ใช่แค่ที่มีฟีเจอร์ดีที่สุด แต่คือที่ครองใจลูกค้าได้** คุณมักโต้แย้งคนที่ละเลยเรื่อง storytelling และ positioning คุณเชื่อว่าการเข้าใจ customer pain point ลึกๆ คือ competitive advantage ที่แท้จริง และจะท้าทายทุก campaign ที่ไม่มี clear target audience`,
  },
  {
    category: "business",
    emoji: "⚖️",
    role: "Legal Counsel",
    name: "Legal Advisor",
    skills: ["legal_research", "risk_assessment", "summarization"],
    soul: `คุณคือที่ปรึกษากฎหมายที่เชี่ยวชาญด้านกฎหมายธุรกิจ สัญญา ทรัพย์สินทางปัญญา และ compliance คุณมีจุดยืนว่า **การประหยัดค่าทนายตอนต้นมักทำให้เสียเงินมากกว่าภายหลัง** คุณมักโต้แย้งการตัดสินใจที่เร่งรีบโดยไม่ตรวจ legal risk และชี้ให้เห็น grey area ที่คนอื่นมองข้าม คุณพูดตรงๆ ว่าอะไรผิดกฎหมาย อะไรเสี่ยง และอะไรปลอดภัย โดยไม่เลี่ยงคำตอบ`,
  },
  {
    category: "business",
    emoji: "👥",
    role: "CHRO / People & Culture",
    name: "HR Lead",
    skills: ["market_research", "risk_assessment", "summarization"],
    soul: `คุณคือ CHRO ที่เชี่ยวชาญด้านการสร้างทีม วัฒนธรรมองค์กร และการบริหารคน คุณมีจุดยืนว่า **วัฒนธรรมองค์กรไม่ใช่สิ่งที่ประกาศบนผนัง แต่คือสิ่งที่เกิดขึ้นจริงในห้องประชุม** คุณมักโต้แย้งแผนที่ไม่ได้คำนึงถึง employee experience และ talent retention คุณเชื่อว่า A-player หนึ่งคนมีค่ามากกว่า B-player สามคน และจะท้าทายทุก hiring decision ที่ compromise กับ culture fit`,
  },
  {
    category: "business",
    emoji: "🤝",
    role: "Sales Coach",
    name: "Sales Coach",
    skills: ["market_research", "data_analysis", "web_search"],
    soul: `คุณคือ Sales Coach ที่มีประสบการณ์ปิดดีลมูลค่าหลายร้อยล้าน คุณมีจุดยืนว่า **ทุกปัญหา sales คือปัญหา process ไม่ใช่ปัญหา talent** คุณมักโต้แย้งคนที่โทษตลาดหรือสินค้าโดยไม่ดู sales funnel ของตัวเอง คุณเชื่อว่า objection handling ที่ดีคือการฟังให้เข้าใจ pain จริงๆ ไม่ใช่การพูดโต้กลับ และจะท้าทายทุก pitch ที่พูดถึงฟีเจอร์มากกว่า outcome ของลูกค้า`,
  },
  {
    category: "business",
    emoji: "⚙️",
    role: "Operations Manager",
    name: "Ops Manager",
    skills: ["data_analysis", "risk_assessment", "financial_modeling"],
    soul: `คุณคือ Operations Manager ที่เชี่ยวชาญด้านการปรับปรุง process, supply chain, และ operational efficiency คุณมีจุดยืนว่า **ปัญหาส่วนใหญ่ในองค์กรไม่ได้เกิดจากคน แต่เกิดจาก process ที่ออกแบบมาไม่ดี** คุณมักโต้แย้งการแก้ปัญหาแบบ reactive และชี้ให้เห็น bottleneck ที่แท้จริง คุณเชื่อใน data-driven decision making และจะท้าทายทุกคนที่ตัดสินใจโดยไม่มี metric ชัดเจน`,
  },

  // ── ทั่วไป ─────────────────────────────────────────────────────────────────
  {
    category: "general",
    emoji: "🤖",
    role: "Custom",
    name: "",
    skills: [],
    soul: "",
  },
];

const EMPTY_FORM = {
  name: "",
  emoji: "🤖",
  provider: "anthropic" as Provider,
  apiKey: "",
  baseUrl: "",
  model: "",
  soul: "",
  role: "",
  skills: [] as string[],
  useWebSearch: false,
  seniority: 50,
  mcpEndpoint: "",
  mcpAccessMode: "general",
  templateIndex: -1,
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [models, setModels] = useState<ModelOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("accounting");
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [agentStats, setAgentStats] = useState<Record<string, { totalSessions: number; totalInputTokens: number; totalOutputTokens: number; lastUsed: string; daily: { date: string; sessions: number; inputTokens: number; outputTokens: number }[] }>>({});

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-stats");
      if (res.ok) setAgentStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchAgents(); fetchStats(); }, [fetchAgents, fetchStats]);

  useEffect(() => {
    if (!form.provider) return;
    fetch(`/api/team-models?provider=${form.provider}`)
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models ?? []);
        if (d.models?.length && !editingId) {
          setForm((f) => ({ ...f, model: d.models[0].id }));
        }
      });
  }, [form.provider, editingId]);

  const applyTemplate = (idx: number) => {
    const t = AGENT_TEMPLATES[idx];
    if (!t) return;
    setForm((f) => ({
      ...f,
      templateIndex: idx,
      role: t.role || f.role,
      emoji: t.emoji || f.emoji,
      soul: t.soul || f.soul,
      name: t.name || f.name,
      skills: t.skills,
    }));
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (agent: Agent) => {
    setForm({
      name: agent.name,
      emoji: agent.emoji,
      provider: agent.provider,
      apiKey: "",
      baseUrl: agent.baseUrl ?? "",
      model: agent.model,
      soul: agent.soul,
      role: agent.role,
      skills: agent.skills ?? [],
      useWebSearch: agent.useWebSearch ?? false,
      seniority: agent.seniority ?? 50,
      mcpEndpoint: agent.mcpEndpoint ?? "",
      mcpAccessMode: agent.mcpAccessMode ?? "general",
      templateIndex: -1,
    });
    setMcpTestResult(null);
    setEditingId(agent.id);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.provider || !form.model || !form.soul.trim() || !form.role.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบ: ชื่อ, Provider, Model, Role, Soul");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        emoji: form.emoji,
        provider: form.provider,
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
        soul: form.soul,
        role: form.role,
        skills: form.skills,
        useWebSearch: form.useWebSearch,
        seniority: form.seniority,
        mcpEndpoint: form.mcpEndpoint.trim() || undefined,
        mcpAccessMode: form.mcpEndpoint.trim() ? form.mcpAccessMode : undefined,
      };
      if (editingId) {
        const res = await fetch(`/api/team-agents/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/team-agents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setShowForm(false);
      setEditingId(null);
      fetchAgents();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/team-agents/${id}`, { method: "DELETE" });
    if (res.ok) { setDeleteConfirm(null); fetchAgents(); }
  };

  const handleToggle = async (agent: Agent) => {
    await fetch(`/api/team-agents/${agent.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !agent.active }),
    });
    fetchAgents();
  };

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skillId) ? f.skills.filter((s) => s !== skillId) : [...f.skills, skillId],
    }));
  };

  const testMcp = async () => {
    const endpoint = form.mcpEndpoint.trim();
    if (!endpoint) return;
    setMcpTesting(true);
    setMcpTestResult(null);
    try {
      const res = await fetch(`/api/team-agents/mcp-test?endpoint=${encodeURIComponent(endpoint)}&mode=${form.mcpAccessMode}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const toolCount = data.toolCount ?? 0;
        setMcpTestResult({ ok: true, msg: `✓ เชื่อมต่อสำเร็จ — ${toolCount} tools พร้อมใช้งาน` });
      } else {
        setMcpTestResult({ ok: false, msg: `✗ ${data.error ?? "เชื่อมต่อไม่ได้"}` });
      }
    } catch {
      setMcpTestResult({ ok: false, msg: "✗ Timeout หรือเชื่อมต่อไม่ได้" });
    } finally {
      setMcpTesting(false);
    }
  };

  const categoriesWithTemplates = Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => ({
    key,
    ...cat,
    templates: AGENT_TEMPLATES.map((t, i) => ({ ...t, idx: i })).filter((t) => t.category === key),
  }));

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)", fontFamily: "monospace" }}>
              👥 Team Agents
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              เลือก template สำเร็จรูป — ใส่แค่ API Key ก็พร้อมใช้งาน
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            + New Agent
          </button>
        </div>

        {/* Stats Summary Bar */}
        {Object.keys(agentStats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Sessions รวม", value: Object.values(agentStats).reduce((s, a) => s + a.totalSessions, 0).toLocaleString(), icon: "🏛️" },
              { label: "Input Tokens", value: formatTokens(Object.values(agentStats).reduce((s, a) => s + a.totalInputTokens, 0)), icon: "📥" },
              { label: "Output Tokens", value: formatTokens(Object.values(agentStats).reduce((s, a) => s + a.totalOutputTokens, 0)), icon: "📤" },
              { label: "Agents ใช้งาน", value: `${Object.keys(agentStats).length}`, icon: "👥" },
            ].map((s) => (
              <div key={s.label} className="border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{s.icon} {s.label}</div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: "var(--text)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Agent List */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : agents.length === 0 ? (
          <div className="border rounded-xl p-12 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="text-5xl mb-4">🏛️</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>ยินดีต้อนรับสู่ BossBoard</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>เริ่มต้นด้วยการสร้างทีมที่ปรึกษา AI ของคุณ</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer"
              style={{ background: "var(--accent)", color: "white" }}
            >
              ✨ สร้างทีมบัญชี
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-xl p-5 flex items-start gap-4 transition-all"
                style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: agent.active ? 1 : 0.5 }}
              >
                <div className="text-3xl">{agent.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-mono" style={{ color: "var(--text)" }}>{agent.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono border ${PROVIDER_COLORS[agent.provider]}`}>
                      {PROVIDER_LABELS[agent.provider]}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      {agent.role}
                    </span>
                    {!agent.hasApiKey && agent.provider !== "ollama" && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                        ⚠ No API Key
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>{agent.model}</div>
                  {agentStats[agent.id] && (
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                        🏛️ {agentStats[agent.id].totalSessions} sessions
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--text-muted)" }}>
                        {formatTokens(agentStats[agent.id].totalInputTokens + agentStats[agent.id].totalOutputTokens)} tokens
                      </span>
                    </div>
                  )}
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.skills.map((s) => {
                        const skill = ALL_SKILLS.find((sk) => sk.id === s);
                        return skill ? (
                          <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                            {skill.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {agent.soul}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(agent)}
                    className="px-3 py-1 rounded text-xs font-mono border transition-all"
                    style={{ borderColor: "var(--border)", color: agent.active ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    {agent.active ? "● On" : "○ Off"}
                  </button>
                  <button
                    onClick={() => openEdit(agent)}
                    className="px-3 py-1 rounded text-xs font-mono border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    Edit
                  </button>
                  {deleteConfirm === agent.id ? (
                    <>
                      <button onClick={() => handleDelete(agent.id)} className="px-3 py-1 rounded text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/30">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 rounded text-xs font-mono border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(agent.id)} className="px-3 py-1 rounded text-xs font-mono border border-red-500/30 text-red-400">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-3xl rounded-2xl border p-6 max-h-[92vh] overflow-y-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold font-mono text-lg" style={{ color: "var(--text)" }}>
                {editingId ? "✏️ Edit Agent" : "✨ New Agent"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }}>✕</button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">{error}</div>
            )}

            {/* ── Template Picker ── */}
            <div className="mb-6">
              <div className="text-xs font-mono mb-3 font-bold" style={{ color: "var(--text-muted)" }}>
                เลือก Template สำเร็จรูป
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {categoriesWithTemplates.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all`}
                    style={{
                      borderColor: activeCategory === cat.key ? "var(--accent)" : "var(--border)",
                      color: activeCategory === cat.key ? "var(--accent)" : "var(--text-muted)",
                      background: activeCategory === cat.key ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Templates in active category */}
              <div className="grid grid-cols-2 gap-2">
                {categoriesWithTemplates
                  .find((c) => c.key === activeCategory)
                  ?.templates.map((t) => (
                    <button
                      key={t.idx}
                      onClick={() => applyTemplate(t.idx)}
                      className="text-left p-3 rounded-xl border transition-all"
                      style={{
                        borderColor: form.templateIndex === t.idx ? "var(--accent)" : "var(--border)",
                        background: form.templateIndex === t.idx ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "color-mix(in srgb, var(--bg) 50%, transparent)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.emoji}</span>
                        <div>
                          <div className="text-xs font-mono font-bold" style={{ color: "var(--text)" }}>{t.role}</div>
                          {t.skills.length > 0 && (
                            <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {t.skills.slice(0, 3).map((s) => ALL_SKILLS.find((sk) => sk.id === s)?.label.split(" ")[0]).join(" · ")}
                            </div>
                          )}
                        </div>
                      </div>
                      {t.soul && (
                        <div className="text-[10px] font-mono line-clamp-2 mt-1" style={{ color: "var(--text-muted)" }}>
                          {t.soul.slice(0, 80)}...
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Name + Emoji + Role */}
              <div className="flex gap-3">
                <div className="w-20">
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Emoji</label>
                  <input
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-center text-xl font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น CEO Advisor"
                    className="w-full px-3 py-2 rounded-lg border font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Role *</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="เช่น CEO / Strategic Advisor"
                    className="w-full px-3 py-2 rounded-lg border font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Provider *</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as Provider, model: "" }))}
                  className="w-full px-3 py-2 rounded-lg border font-mono"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* API Key — highlight */}
              <div className="p-4 rounded-xl border-2" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                <label className="text-xs font-mono mb-1 block font-bold" style={{ color: "var(--accent)" }}>
                  🔑 API Key {editingId ? "(เว้นว่างถ้าไม่ต้องการเปลี่ยน)" : "— ใส่แค่นี้เพียงอย่างเดียว!"}
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={editingId ? "••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "sk-ant-xxx / sk-xxx / AIzaSy..."}
                  className="w-full px-3 py-2 rounded-lg border font-mono"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              {/* Base URL */}
              {(form.provider === "ollama" || form.provider === "custom") && (
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>
                    Base URL {form.provider === "ollama" ? "(default: http://localhost:11434)" : "(OpenAI-compatible endpoint)"}
                  </label>
                  <input
                    value={form.baseUrl}
                    onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                    placeholder={form.provider === "ollama" ? "http://localhost:11434" : "https://your-api.com/v1"}
                    className="w-full px-3 py-2 rounded-lg border font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              )}

              {/* Model */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Model *</label>
                {models.length > 0 ? (
                  <select
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <option value="">เลือก model...</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({(m.contextWindow / 1000).toFixed(0)}K ctx)</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="ชื่อ model เช่น llama3.2, custom-model"
                    className="w-full px-3 py-2 rounded-lg border font-mono"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                )}
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs font-mono mb-2 block font-bold" style={{ color: "var(--text-muted)" }}>
                  Skills / ความสามารถพิเศษ
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_SKILLS.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className="flex items-start gap-2 p-2 rounded-lg border text-left transition-all"
                      style={{
                        borderColor: form.skills.includes(skill.id) ? "var(--accent)" : "var(--border)",
                        background: form.skills.includes(skill.id) ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                      }}
                    >
                      <span className="text-xs font-mono font-bold" style={{ color: form.skills.includes(skill.id) ? "var(--accent)" : "var(--text)" }}>
                        {skill.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Web Search + Seniority */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <div>
                    <div className="text-xs font-mono font-bold" style={{ color: "var(--text)" }}>🔍 Web Search</div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>ค้นหาข้อมูลจากอินเทอร์เน็ต</div>
                  </div>
                  <button
                    type="button"
                    title={form.useWebSearch ? "ปิด Web Search" : "เปิด Web Search"}
                    aria-label={form.useWebSearch ? "ปิด Web Search" : "เปิด Web Search"}
                    onClick={() => setForm((f) => ({ ...f, useWebSearch: !f.useWebSearch }))}
                    className="w-10 h-5 rounded-full transition-all relative"
                    style={{ background: form.useWebSearch ? "var(--accent)" : "var(--border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form.useWebSearch ? "calc(100% - 18px)" : "2px" }}
                    />
                  </button>
                </div>
                <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <label className="text-xs font-mono font-bold block mb-1" style={{ color: "var(--text)" }}>
                    🏛️ Seniority (ลำดับพูด)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={form.seniority}
                      aria-label="ลำดับ Seniority"
                      title="ลำดับ Seniority — 1 = ประธาน, 99 = พูดท้าย"
                      onChange={(e) => setForm((f) => ({ ...f, seniority: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-center" style={{ color: "var(--accent)" }}>{form.seniority}</span>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>1 = ประธาน, 99 = พูดท้าย</div>
                </div>
              </div>

              {/* MCP Server */}
              <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="text-xs font-mono font-bold mb-3" style={{ color: "var(--text)" }}>
                  🔌 MCP Server Connection <span className="font-normal" style={{ color: "var(--text-muted)" }}>(ไม่บังคับ)</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>MCP Endpoint URL <span className="font-normal">(ใส่ base URL เช่น http://ip:3002)</span></label>
                    <input
                      value={form.mcpEndpoint}
                      onChange={(e) => { setForm((f) => ({ ...f, mcpEndpoint: e.target.value })); setMcpTestResult(null); }}
                      placeholder="http://192.168.1.100:3002"
                      className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  </div>
                  {form.mcpEndpoint.trim() && (
                    <div className="flex gap-3 items-start">
                      <div className="flex-1">
                        <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>Access Mode</label>
                        <select
                          value={form.mcpAccessMode}
                          onChange={(e) => setForm((f) => ({ ...f, mcpAccessMode: e.target.value }))}
                          title="MCP Access Mode"
                          aria-label="MCP Access Mode"
                          className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
                          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          <option value="general">general — ทั่วไป</option>
                          <option value="admin">admin — ทุก tools</option>
                          <option value="sales">sales — ขาย</option>
                          <option value="purchase">purchase — จัดซื้อ</option>
                          <option value="stock">stock — คลัง</option>
                        </select>
                      </div>
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={testMcp}
                          disabled={mcpTesting}
                          className="px-4 py-2 rounded-lg text-xs font-mono border transition-all disabled:opacity-50"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          {mcpTesting ? "กำลังทดสอบ..." : "🔍 ทดสอบ"}
                        </button>
                      </div>
                    </div>
                  )}
                  {mcpTestResult && (
                    <div
                      className="text-xs font-mono px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: mcpTestResult.ok ? "#22c55e40" : "#ef444440",
                        background: mcpTestResult.ok ? "#22c55e10" : "#ef444410",
                        color: mcpTestResult.ok ? "#4ade80" : "#f87171",
                      }}
                    >
                      {mcpTestResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Soul */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-muted)" }}>
                  Soul (System Prompt) * — บุคลิกและบทบาทของ agent
                </label>
                <textarea
                  value={form.soul}
                  onChange={(e) => setForm((f) => ({ ...f, soul: e.target.value }))}
                  rows={5}
                  placeholder="อธิบายบุคลิก ความเชี่ยวชาญ และวิธีการทำงานของ agent นี้..."
                  className="w-full px-3 py-2 rounded-lg border font-mono text-sm resize-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.soul.length} ตัวอักษร</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-mono border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-mono font-bold disabled:opacity-50 transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {saving ? "Saving..." : editingId ? "Update Agent" : "Create Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
