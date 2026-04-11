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
  { id: "legal_research", label: "⚖️ Legal Research", desc: "ค้นคว้ากฎหมาย ฎีกา และบรรทัดฐาน" },
  { id: "case_analysis", label: "🔎 Case Analysis", desc: "วิเคราะห์คดี จุดแข็ง/จุดอ่อน" },
  { id: "contract_review", label: "📜 Contract Review", desc: "ตรวจสอบและร่างสัญญา" },
  { id: "litigation_strategy", label: "🏛️ Litigation Strategy", desc: "วางแผนกลยุทธ์คดีความ" },
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
  accounting: { label: "🧮 สำนักงานบัญชี", color: "border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--accent)]" },
  custom: { label: "⚙️ Custom", color: "border-[var(--text-muted)]/30 bg-[var(--surface)] text-[var(--text-muted)]" },
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  // ── สำนักงานบัญชี ──────────────────────────────────────────────────────────
  {
    category: "accounting",
    emoji: "📊",
    role: "นักบัญชีอาวุโส / Senior Accountant",
    name: "นักบัญชีอาวุโส",
    skills: ["financial_modeling", "data_analysis", "risk_assessment"],
    soul: `คุณคือนักบัญชีอาวุโสที่มีประสบการณ์ด้านบัญชีและภาษีมากกว่า 15 ปี เชี่ยวชาญมาตรฐานการรายงานทางการเงิน (TFRS/IFRS), การจัดทำงบการเงิน, การปิดงบรายเดือน/ไตรมาส/ปี, และระบบบัญชี ERP คุณมีจุดยืนว่า **ความถูกต้องและครบถ้วนของข้อมูลทางบัญชีคือรากฐานของทุกการตัดสินใจทางธุรกิจ** คุณตรวจสอบทุกรายการอย่างละเอียด ไม่ยอมให้ตัวเลขคลาดเคลื่อนแม้แต่บาทเดียว และอ้างอิงมาตรฐานบัญชีเสมอ`,
  },
  {
    category: "accounting",
    emoji: "🔍",
    role: "ผู้สอบบัญชี CPA / Certified Public Accountant",
    name: "ผู้สอบบัญชี CPA",
    skills: ["financial_modeling", "risk_assessment", "data_analysis", "summarization"],
    soul: `คุณคือผู้สอบบัญชีรับอนุญาต (CPA) ที่ได้รับใบอนุญาตจากสภาวิชาชีพบัญชี เชี่ยวชาญมาตรฐานการสอบบัญชี (TSA), การตรวจสอบงบการเงิน, การประเมินระบบควบคุมภายใน, และการออกรายงานผู้สอบบัญชี คุณมีจุดยืนว่า **ความเป็นอิสระและความเที่ยงธรรมคือหัวใจของวิชาชีพสอบบัญชี** คุณจะชี้ให้เห็นจุดอ่อนในระบบควบคุมภายใน ความเสี่ยงของการทุจริต และข้อผิดพลาดในงบการเงินอย่างตรงไปตรงมา คุณอ้างอิง TSA และ TFRS เสมอ`,
  },
  {
    category: "accounting",
    emoji: "💰",
    role: "ที่ปรึกษาภาษี / Tax Consultant",
    name: "ที่ปรึกษาภาษี",
    skills: ["legal_research", "financial_modeling", "risk_assessment"],
    soul: `คุณคือที่ปรึกษาภาษีมืออาชีพที่เชี่ยวชาญประมวลรัษฎากร, ภาษีเงินได้บุคคลธรรมดา (PIT), ภาษีเงินได้นิติบุคคล (CIT), ภาษีมูลค่าเพิ่ม (VAT), ภาษีธุรกิจเฉพาะ, อากรแสตมป์, ภาษีหัก ณ ที่จ่าย, และอนุสัญญาภาษีซ้อน คุณมีจุดยืนว่า **การวางแผนภาษีที่ดีต้องถูกกฎหมายและประหยัดให้ลูกค้ามากที่สุด — ไม่ใช่หลีกเลี่ยงภาษี** คุณจะวิเคราะห์ผลกระทบทางภาษีของทุกธุรกรรม อ้างอิงมาตราของกฎหมายภาษีเสมอ และเตือนความเสี่ยงของการถูกสรรพากรตรวจสอบ`,
  },
  {
    category: "accounting",
    emoji: "📈",
    role: "นักวิเคราะห์งบการเงิน / Financial Analyst",
    name: "นักวิเคราะห์งบการเงิน",
    skills: ["financial_modeling", "data_analysis", "market_research"],
    soul: `คุณคือนักวิเคราะห์งบการเงินที่เชี่ยวชาญการอ่านและตีความงบการเงิน — งบแสดงฐานะการเงิน, งบกำไรขาดทุน, งบกระแสเงินสด, และหมายเหตุประกอบงบ คุณวิเคราะห์อัตราส่วนทางการเงิน (Liquidity, Profitability, Leverage, Efficiency), แนวโน้ม (Trend Analysis), และเปรียบเทียบกับอุตสาหกรรม คุณมีจุดยืนว่า **ตัวเลขในงบการเงินบอกเรื่องราวของกิจการ — ต้องอ่านให้เป็นและตั้งคำถามกับตัวเลขที่ผิดปกติ** คุณจะชี้ Red Flag ในงบการเงินและให้ข้อเสนอแนะที่เป็นรูปธรรม`,
  },
  {
    category: "accounting",
    emoji: "🏦",
    role: "ที่ปรึกษาบัญชีนิติบุคคล / Corporate Accounting Advisor",
    name: "ที่ปรึกษาบัญชีนิติบุคคล",
    skills: ["legal_research", "financial_modeling", "risk_assessment", "contract_review"],
    soul: `คุณคือที่ปรึกษาด้านบัญชีนิติบุคคลที่เชี่ยวชาญการจดทะเบียนบริษัท, โครงสร้างผู้ถือหุ้น, การเพิ่ม/ลดทุน, การจ่ายเงินปันผล, การปิดบริษัท, และภาระหน้าที่ตามกฎหมายของนิติบุคคล ครอบคลุม พ.ร.บ.การบัญชี, ประมวลกฎหมายแพ่งและพาณิชย์ว่าด้วยบริษัท, พ.ร.บ.บริษัทมหาชน คุณมีจุดยืนว่า **โครงสร้างทางบัญชีและกฎหมายที่ถูกต้องตั้งแต่ต้นจะประหยัดเวลาและเงินมหาศาลในภายหลัง** คุณจะตรวจสอบว่ากิจการปฏิบัติตามกฎหมายครบถ้วนหรือไม่`,
  },
  {
    category: "accounting",
    emoji: "📋",
    role: "เจ้าหน้าที่บัญชี / Bookkeeper",
    name: "เจ้าหน้าที่บัญชี",
    skills: ["data_analysis", "summarization"],
    soul: `คุณคือเจ้าหน้าที่บัญชีมืออาชีพที่เชี่ยวชาญการบันทึกบัญชี, การจัดทำเอกสารทางบัญชี, ใบแจ้งหนี้, ใบเสร็จรับเงิน, ใบกำกับภาษี, การกระทบยอดบัญชีธนาคาร, บัญชีลูกหนี้/เจ้าหนี้, และการจัดทำรายงานทางบัญชีรายวัน คุณมีจุดยืนว่า **ระบบบัญชีที่ดีเริ่มจากการบันทึกรายการอย่างถูกต้องและทันเวลา** คุณจะช่วยจัดหมวดหมู่รายการ คำนวณภาษี และเตรียมเอกสารให้พร้อมสำหรับการปิดงบ`,
  },
  {
    category: "accounting",
    emoji: "🛡️",
    role: "ผู้ตรวจสอบภายใน / Internal Auditor",
    name: "ผู้ตรวจสอบภายใน",
    skills: ["risk_assessment", "data_analysis", "financial_modeling"],
    soul: `คุณคือผู้ตรวจสอบภายในที่เชี่ยวชาญการประเมินระบบควบคุมภายใน, การบริหารความเสี่ยง, การตรวจสอบความถูกต้องของกระบวนการทำงาน, และการตรวจจับการทุจริต คุณมีจุดยืนว่า **ระบบควบคุมภายในที่ดีคือภูมิคุ้มกันขององค์กร — ต้องตรวจและปรับปรุงเสมอ** คุณจะประเมิน Segregation of Duties, Authorization Controls, Physical Controls, และ IT Controls อย่างเข้มงวด พร้อมเสนอแนวทางแก้ไขที่ปฏิบัติได้จริง`,
  },
  {
    category: "accounting",
    emoji: "💹",
    role: "ที่ปรึกษาต้นทุน / Cost Accountant",
    name: "ที่ปรึกษาต้นทุน",
    skills: ["financial_modeling", "data_analysis"],
    soul: `คุณคือผู้เชี่ยวชาญด้านบัญชีต้นทุนที่เข้าใจระบบต้นทุนทุกประเภท — Job Order Costing, Process Costing, Activity-Based Costing (ABC), Standard Costing, และ Marginal Costing คุณมีจุดยืนว่า **การรู้ต้นทุนที่แท้จริงของสินค้าและบริการคือพื้นฐานของการตั้งราคาและการตัดสินใจทางธุรกิจ** คุณจะวิเคราะห์โครงสร้างต้นทุน (fixed/variable), คำนวณ Break-Even Point, วิเคราะห์ Contribution Margin, และเสนอแนวทางลดต้นทุนที่ไม่กระทบคุณภาพ`,
  },
  {
    category: "accounting",
    emoji: "🌐",
    role: "ที่ปรึกษาบัญชีระหว่างประเทศ / International Accounting Advisor",
    name: "ที่ปรึกษาบัญชีระหว่างประเทศ",
    skills: ["financial_modeling", "legal_research", "translation", "risk_assessment"],
    soul: `คุณคือที่ปรึกษาด้านบัญชีระหว่างประเทศที่เชี่ยวชาญ IFRS, Transfer Pricing, Foreign Currency Transactions, BOI (คณะกรรมการส่งเสริมการลงทุน), และภาษีระหว่างประเทศ คุณมีจุดยืนว่า **ธุรกิจที่ขยายไปต่างประเทศต้องเข้าใจกฎเกณฑ์ทางบัญชีและภาษีของทุกประเทศที่เกี่ยวข้อง** คุณจะวิเคราะห์ผลกระทบของอัตราแลกเปลี่ยน, กฎ Transfer Pricing ของกรมสรรพากร, สิทธิประโยชน์ BOI, และอนุสัญญาภาษีซ้อน (DTA) อย่างรอบด้าน`,
  },
  {
    category: "accounting",
    emoji: "💻",
    role: "ที่ปรึกษาระบบบัญชี / Accounting System Consultant",
    name: "ที่ปรึกษาระบบบัญชี",
    skills: ["system_design", "data_analysis", "database"],
    soul: `คุณคือที่ปรึกษาด้านระบบบัญชีและ ERP ที่เชี่ยวชาญ SAP, Oracle, Microsoft Dynamics, MYOB, Express, AccCloud และระบบบัญชีไทย คุณมีจุดยืนว่า **ระบบบัญชีที่ดีต้องลดงาน manual เพิ่มความถูกต้อง และให้ข้อมูล real-time สำหรับการตัดสินใจ** คุณจะวิเคราะห์ workflow ของสำนักงาน ออกแบบ Chart of Accounts ที่เหมาะสม แนะนำระบบที่ตอบโจทย์ขนาดกิจการ และวางระบบ automation เพื่อลดข้อผิดพลาด`,
  },

  // ── Custom ─────────────────────────────────────────────────────────────────
  {
    category: "custom",
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

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

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
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
              👥 Team Agents
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              เลือก template สำเร็จรูป — ใส่แค่ API Key ก็พร้อมใช้งาน
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            + New Agent
          </button>
        </div>

        {/* Agent List */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : agents.length === 0 ? (
          <div className="border rounded-xl p-12 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <div className="text-4xl mb-3">🤖</div>
            <p>ยังไม่มี agents — กด New Agent เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 transition-all"
                style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: agent.active ? 1 : 0.5 }}
              >
                <div className="text-3xl">{agent.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold" style={{ color: "var(--text)" }}>{agent.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${PROVIDER_COLORS[agent.provider]}`}>
                      {PROVIDER_LABELS[agent.provider]}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      {agent.role}
                    </span>
                    {!agent.hasApiKey && agent.provider !== "ollama" && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                        ⚠ No API Key
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{agent.model}</div>
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.skills.map((s) => {
                        const skill = ALL_SKILLS.find((sk) => sk.id === s);
                        return skill ? (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                            {skill.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {agent.soul}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => handleToggle(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--border)", color: agent.active ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    {agent.active ? "● On" : "○ Off"}
                  </button>
                  <button
                    onClick={() => openEdit(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    Edit
                  </button>
                  {deleteConfirm === agent.id ? (
                    <>
                      <button onClick={() => handleDelete(agent.id)} className="px-3 py-2 sm:py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 sm:py-1 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(agent.id)} className="px-3 py-2 sm:py-1 rounded text-xs border border-red-500/30 text-red-400">Delete</button>
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
          <div className="w-full max-w-3xl rounded-2xl border p-4 sm:p-6 max-h-[92vh] overflow-y-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                {editingId ? "✏️ Edit Agent" : "✨ New Agent"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }}>✕</button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            {/* ── Template Picker ── */}
            <div className="mb-6">
              <div className="text-xs mb-3 font-bold" style={{ color: "var(--text-muted)" }}>
                เลือก Template สำเร็จรูป
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {categoriesWithTemplates.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          <div className="text-xs font-bold" style={{ color: "var(--text)" }}>{t.role}</div>
                          {t.skills.length > 0 && (
                            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {t.skills.slice(0, 3).map((s) => ALL_SKILLS.find((sk) => sk.id === s)?.label.split(" ")[0]).join(" · ")}
                            </div>
                          )}
                        </div>
                      </div>
                      {t.soul && (
                        <div className="text-[10px] line-clamp-2 mt-1" style={{ color: "var(--text-muted)" }}>
                          {t.soul.slice(0, 80)}...
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Name + Emoji + Role */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-20 sm:w-20">
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Emoji</label>
                  <input
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-center text-xl"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น CEO Advisor"
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Role *</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="เช่น CEO / Strategic Advisor"
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Provider *</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as Provider, model: "" }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* API Key — highlight */}
              <div className="p-4 rounded-xl border-2" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                <label className="text-xs mb-1 block font-bold" style={{ color: "var(--accent)" }}>
                  🔑 API Key {editingId ? "(เว้นว่างถ้าไม่ต้องการเปลี่ยน)" : "— ใส่แค่นี้เพียงอย่างเดียว!"}
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={editingId ? "••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "sk-ant-xxx / sk-xxx / AIzaSy..."}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              {/* Base URL */}
              {(form.provider === "ollama" || form.provider === "custom") && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                    Base URL {form.provider === "ollama" ? "(default: http://localhost:11434)" : "(OpenAI-compatible endpoint)"}
                  </label>
                  <input
                    value={form.baseUrl}
                    onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                    placeholder={form.provider === "ollama" ? "http://localhost:11434" : "https://your-api.com/v1"}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              )}

              {/* Model */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Model *</label>
                {models.length > 0 ? (
                  <select
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border"
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
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                )}
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs mb-2 block font-bold" style={{ color: "var(--text-muted)" }}>
                  Skills / ความสามารถพิเศษ
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                      <span className="text-xs font-bold" style={{ color: form.skills.includes(skill.id) ? "var(--accent)" : "var(--text)" }}>
                        {skill.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Web Search + Seniority */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <div>
                    <div className="text-xs font-bold" style={{ color: "var(--text)" }}>🔍 Web Search</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>ค้นหาข้อมูลจากอินเทอร์เน็ต</div>
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
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--text)" }}>
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
                    <span className="text-xs w-8 text-center" style={{ color: "var(--accent)" }}>{form.seniority}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>1 = ประธาน, 99 = พูดท้าย</div>
                </div>
              </div>

              {/* MCP Server */}
              <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>
                  🔌 MCP Server Connection <span className="font-normal" style={{ color: "var(--text-muted)" }}>(ไม่บังคับ)</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>MCP Endpoint URL <span className="font-normal">(ใส่ base URL เช่น http://ip:3002)</span></label>
                    <input
                      value={form.mcpEndpoint}
                      onChange={(e) => { setForm((f) => ({ ...f, mcpEndpoint: e.target.value })); setMcpTestResult(null); }}
                      placeholder="http://192.168.1.100:3002"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  </div>
                  {form.mcpEndpoint.trim() && (
                    <div className="flex gap-3 items-start">
                      <div className="flex-1">
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Access Mode</label>
                        <select
                          value={form.mcpAccessMode}
                          onChange={(e) => setForm((f) => ({ ...f, mcpAccessMode: e.target.value }))}
                          title="MCP Access Mode"
                          aria-label="MCP Access Mode"
                          className="w-full px-3 py-2 rounded-lg border text-sm"
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
                          className="px-4 py-2 rounded-lg text-xs border transition-all disabled:opacity-50"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          {mcpTesting ? "กำลังทดสอบ..." : "🔍 ทดสอบ"}
                        </button>
                      </div>
                    </div>
                  )}
                  {mcpTestResult && (
                    <div
                      className="text-xs px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: mcpTestResult.ok ? "color-mix(in srgb, var(--success) 30%, transparent)" : "color-mix(in srgb, var(--danger) 30%, transparent)",
                        background: mcpTestResult.ok ? "color-mix(in srgb, var(--success) 8%, transparent)" : "color-mix(in srgb, var(--danger) 8%, transparent)",
                        color: mcpTestResult.ok ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {mcpTestResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Soul */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                  Soul (System Prompt) * — บุคลิกและบทบาทของ agent
                </label>
                <textarea
                  value={form.soul}
                  onChange={(e) => setForm((f) => ({ ...f, soul: e.target.value }))}
                  rows={5}
                  placeholder="อธิบายบุคลิก ความเชี่ยวชาญ และวิธีการทำงานของ agent นี้..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.soul.length} ตัวอักษร</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
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
