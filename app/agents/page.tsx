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

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: "bg-rose-500/20 text-rose-300 border-rose-500/30",
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
  recommendedModel: string;
  recommendedReason: string;
}

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  accounting: { label: "🧮 สำนักงานบัญชี", color: "border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--accent)]" },
  custom: { label: "⚙️ Custom", color: "border-[var(--text-muted)]/30 bg-[var(--surface)] text-[var(--text-muted)]" },
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    category: "accounting",
    emoji: "📊",
    role: "นักบัญชีอาวุโส / Senior Accountant",
    name: "นักบัญชีอาวุโส",
    recommendedModel: "anthropic/claude-4-sonnet",
    recommendedReason: "สมดุลคุณภาพ/ราคา เหมาะงานบัญชีที่ต้องการความแม่นยำสูง",
    skills: ["financial_modeling", "data_analysis", "risk_assessment"],
    soul: `คุณคือนักบัญชีอาวุโสที่มีประสบการณ์ด้านบัญชีและภาษีมากกว่า 15 ปี เชี่ยวชาญมาตรฐานการรายงานทางการเงิน (TFRS/IFRS), การจัดทำงบการเงิน, การปิดงบรายเดือน/ไตรมาส/ปี, และระบบบัญชี ERP คุณมีจุดยืนว่า **ความถูกต้องและครบถ้วนของข้อมูลทางบัญชีคือรากฐานของทุกการตัดสินใจทางธุรกิจ** คุณตรวจสอบทุกรายการอย่างละเอียด ไม่ยอมให้ตัวเลขคลาดเคลื่อนแม้แต่บาทเดียว และอ้างอิงมาตรฐานบัญชีเสมอ`,
  },
  {
    category: "accounting",
    emoji: "🔍",
    role: "ผู้สอบบัญชี CPA / Certified Public Accountant",
    name: "ผู้สอบบัญชี CPA",
    recommendedModel: "anthropic/claude-4.6-opus",
    recommendedReason: "ต้องการความแม่นยำสูงสุด เพราะเป็นงานตรวจสอบที่มีผลทางกฎหมาย",
    skills: ["financial_modeling", "risk_assessment", "data_analysis", "summarization"],
    soul: `คุณคือผู้สอบบัญชีรับอนุญาต (CPA) ที่ได้รับใบอนุญาตจากสภาวิชาชีพบัญชี เชี่ยวชาญมาตรฐานการสอบบัญชี (TSA), การตรวจสอบงบการเงิน, การประเมินระบบควบคุมภายใน, และการออกรายงานผู้สอบบัญชี คุณมีจุดยืนว่า **ความเป็นอิสระและความเที่ยงธรรมคือหัวใจของวิชาชีพสอบบัญชี** คุณจะชี้ให้เห็นจุดอ่อนในระบบควบคุมภายใน ความเสี่ยงของการทุจริต และข้อผิดพลาดในงบการเงินอย่างตรงไปตรงมา คุณอ้างอิง TSA และ TFRS เสมอ`,
  },
  {
    category: "accounting",
    emoji: "💰",
    role: "ที่ปรึกษาภาษี / Tax Consultant",
    name: "ที่ปรึกษาภาษี",
    recommendedModel: "anthropic/claude-4.5-sonnet",
    recommendedReason: "ต้องการความรู้เชิงลึกด้านกฎหมายภาษี context ยาวสำหรับอ้างอิงประมวลรัษฎากร",
    skills: ["legal_research", "financial_modeling", "risk_assessment"],
    soul: `คุณคือที่ปรึกษาภาษีมืออาชีพที่เชี่ยวชาญประมวลรัษฎากร, ภาษีเงินได้บุคคลธรรมดา (PIT), ภาษีเงินได้นิติบุคคล (CIT), ภาษีมูลค่าเพิ่ม (VAT), ภาษีธุรกิจเฉพาะ, อากรแสตมป์, ภาษีหัก ณ ที่จ่าย, และอนุสัญญาภาษีซ้อน คุณมีจุดยืนว่า **การวางแผนภาษีที่ดีต้องถูกกฎหมายและประหยัดให้ลูกค้ามากที่สุด — ไม่ใช่หลีกเลี่ยงภาษี** คุณจะวิเคราะห์ผลกระทบทางภาษีของทุกธุรกรรม อ้างอิงมาตราของกฎหมายภาษีเสมอ และเตือนความเสี่ยงของการถูกสรรพากรตรวจสอบ`,
  },
  {
    category: "accounting",
    emoji: "📈",
    role: "นักวิเคราะห์งบการเงิน / Financial Analyst",
    name: "นักวิเคราะห์งบการเงิน",
    recommendedModel: "google/gemini-2.5-pro-preview-06-05",
    recommendedReason: "context ยาว1M เหมาะวิเคราะห์งบการเงินยาวๆ คุ้มค่ากว่า Claude",
    skills: ["financial_modeling", "data_analysis", "market_research"],
    soul: `คุณคือนักวิเคราะห์งบการเงินที่เชี่ยวชาญการอ่านและตีความงบการเงิน — งบแสดงฐานะการเงิน, งบกำไรขาดทุน, งบกระแสเงินสด, และหมายเหตุประกอบงบ คุณวิเคราะห์อัตราส่วนทางการเงิน (Liquidity, Profitability, Leverage, Efficiency), แนวโน้ม (Trend Analysis), และเปรียบเทียบกับอุตสาหกรรม คุณมีจุดยืนว่า **ตัวเลขในงบการเงินบอกเรื่องราวของกิจการ — ต้องอ่านให้เป็นและตั้งคำถามกับตัวเลขที่ผิดปกติ** คุณจะชี้ Red Flag ในงบการเงินและให้ข้อเสนอแนะที่เป็นรูปธรรม`,
  },
  {
    category: "accounting",
    emoji: "🛡️",
    role: "ผู้ตรวจสอบภายใน / Internal Auditor",
    name: "ผู้ตรวจสอบภายใน",
    recommendedModel: "anthropic/claude-4-sonnet",
    recommendedReason: "สมดุลคุณภาพ/ราคา เหมาะงานตรวจสอบที่ต้องการความละเอียดสูง",
    skills: ["risk_assessment", "data_analysis", "financial_modeling"],
    soul: `คุณคือผู้ตรวจสอบภายในที่เชี่ยวชาญการประเมินระบบควบคุมภายใน, การบริหารความเสี่ยง, การตรวจสอบความถูกต้องของกระบวนการทำงาน, และการตรวจจับการทุจริต คุณมีจุดยืนว่า **ระบบควบคุมภายในที่ดีคือภูมิคุ้มกันขององค์กร — ต้องตรวจและปรับปรุงเสมอ** คุณจะประเมิน Segregation of Duties, Authorization Controls, Physical Controls, และ IT Controls อย่างเข้มงวด พร้อมเสนอแนวทางแก้ไขที่ปฏิบัติได้จริง`,
  },
  {
    category: "custom",
    emoji: "🤖",
    role: "Custom",
    name: "",
    recommendedModel: "",
    recommendedReason: "",
    skills: [],
    soul: "",
  },
];

const EMPTY_FORM = {
  name: "",
  emoji: "🤖",
  provider: "openrouter" as Provider,
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
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("accounting");
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [formStep, setFormStep] = useState(0);

  // Knowledge base state
  const [knowledgeAgentId, setKnowledgeAgentId] = useState<string | null>(null);
  const [knowledgeAgentName, setKnowledgeAgentName] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<{ id: string; filename: string; meta: string; tokens: number; uploadedAt: string; preview: string }[]>([]);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgePreview, setKnowledgePreview] = useState<{ filename: string; tokens: number; preview?: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  useEffect(() => {
    fetch("/api/team-models?provider=openrouter")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
  }, []);

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
      model: t.recommendedModel || f.model,
    }));
    setModelSearch("");
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setError("");
    setShowAdvanced(false);
    setFormStep(0);
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
    setFormStep(0);
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

  // Knowledge base functions
  const openKnowledge = async (agent: Agent) => {
    setKnowledgeAgentId(agent.id);
    setKnowledgeAgentName(`${agent.emoji} ${agent.name}`);
    setKnowledgePreview(null);
    try {
      const res = await fetch(`/api/team-agents/${agent.id}/knowledge`);
      const data = await res.json();
      setKnowledgeFiles(data.knowledge ?? []);
    } catch { setKnowledgeFiles([]); }
  };

  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !knowledgeAgentId) return;
    setKnowledgeUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/team-agents/${knowledgeAgentId}/knowledge`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeFiles((prev) => [...prev, data.knowledge]);
        setKnowledgePreview({ filename: data.knowledge.filename, tokens: data.knowledge.tokens, preview: data.knowledge.preview });
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch { alert("Upload failed"); }
    setKnowledgeUploading(false);
    e.target.value = "";
  };

  const handleKnowledgeDelete = async (knowledgeId: string) => {
    if (!knowledgeAgentId) return;
    const res = await fetch(`/api/team-agents/${knowledgeAgentId}/knowledge`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledgeId }),
    });
    if (res.ok) {
      setKnowledgeFiles((prev) => prev.filter((k) => k.id !== knowledgeId));
      setKnowledgePreview(null);
    }
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
              เลือกตำแหน่ง → ระดับความสามารถ → ใส่ API Key → พร้อมใช้!
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
                    <span className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      {agent.role}
                    </span>
                    {!agent.hasApiKey && (
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
                    onClick={() => openKnowledge(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    title="ฐานความรู้"
                  >
                    📚 Knowledge
                  </button>
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

      {/* ── Modal Form (Step Wizard) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-3xl rounded-2xl border flex flex-col max-h-[95vh] sm:max-h-[92vh]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {/* Header + Step indicator */}
            <div className="flex-shrink-0 p-4 sm:p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  {editingId ? "✏️ Edit Agent" : "✨ New Agent"}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-xl w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }}>✕</button>
              </div>

              {/* Step Progress */}
              <div className="flex items-center gap-1 mb-4">
                {[
                  { label: "ตำแหน่ง", icon: "🎭" },
                  { label: "Model", icon: "🤖" },
                  { label: "ข้อมูล", icon: "📝" },
                  { label: "ขั้นสูง", icon: "⚙️" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <button
                      onClick={() => setFormStep(i)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all w-full"
                      style={{
                        background: formStep === i ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                        color: formStep === i ? "var(--accent)" : formStep > i ? "var(--success, var(--green))" : "var(--text-muted)",
                      }}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{
                        background: formStep === i ? "var(--accent)" : formStep > i ? "var(--success, var(--green))" : "var(--border)",
                        color: formStep === i || formStep > i ? "#000" : "var(--text-muted)",
                      }}>
                        {formStep > i ? "✓" : i + 1}
                      </span>
                      <span className="hidden sm:inline truncate">{s.label}</span>
                      <span className="sm:hidden">{s.icon}</span>
                    </button>
                    {i < 3 && <div className="w-4 h-px flex-shrink-0" style={{ background: formStep > i ? "var(--success, var(--green))" : "var(--border)" }} />}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-4 sm:mx-6 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            {/* Step Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">

              {/* ── Step 0: Template Picker ── */}
              {formStep === 0 && (
                <div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>เลือก template สำเร็จรูป หรือข้ามเพื่อสร้างเอง</p>

                  {/* Category tabs */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {categoriesWithTemplates.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className="px-3 py-1.5 rounded-lg text-xs border transition-all"
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

                  {/* Template cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {categoriesWithTemplates
                      .find((c) => c.key === activeCategory)
                      ?.templates.map((t) => {
                        const recModel = models.find((m) => m.id === t.recommendedModel);
                        return (
                          <button
                            key={t.idx}
                            onClick={() => applyTemplate(t.idx)}
                            className="text-left p-4 rounded-xl border-2 transition-all"
                            style={{
                              borderColor: form.templateIndex === t.idx ? "var(--accent)" : "var(--border)",
                              background: form.templateIndex === t.idx ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "color-mix(in srgb, var(--bg) 50%, transparent)",
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{t.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{t.role.split(" / ")[0]}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{t.role.split(" / ")[1] || ""}</div>
                                {t.recommendedModel && (
                                  <div className="text-[10px] mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--border) 50%, transparent)", color: "var(--text-muted)" }}>
                                    💡 {recModel?.name?.replace(/^[⭐🆓] /, "") || t.recommendedModel.split("/").pop()}
                                  </div>
                                )}
                              </div>
                              {form.templateIndex === t.idx && (
                                <span style={{ color: "var(--accent)" }}>✓</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Step 1: Model Selector ── */}
              {formStep === 1 && (
                <div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>เลือก AI Model ที่ต้องการ — มีคำแนะนำตาม template</p>

                  {/* Recommendation banner */}
                  {(() => {
                    const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                    if (!tmpl || !tmpl.recommendedModel) return null;
                    const recModelObj = models.find((m) => m.id === tmpl.recommendedModel);
                    const isUsingRec = form.model === tmpl.recommendedModel;
                    return (
                      <div
                        className="mb-3 p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all"
                        style={{
                          borderColor: isUsingRec ? "var(--accent)" : "color-mix(in srgb, var(--accent) 40%, transparent)",
                          background: isUsingRec ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "color-mix(in srgb, var(--accent) 4%, transparent)",
                        }}
                        onClick={() => setForm((f) => ({ ...f, model: tmpl.recommendedModel }))}
                      >
                        <span className="text-lg">💡</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                            แนะนำสำหรับ {tmpl.role.split(" / ")[0]}
                          </div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text)" }}>
                            {recModelObj?.name?.replace(/^[⭐🆓] /, "") || tmpl.recommendedModel}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {tmpl.recommendedReason}
                            {recModelObj && <span> · context: {(recModelObj.contextWindow / 1000).toFixed(0)}K</span>}
                          </div>
                        </div>
                        {isUsingRec ? (
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>✓ ใช้อยู่</span>
                        ) : (
                          <span className="text-[10px] px-2 py-1 rounded border flex-shrink-0" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>ใช้ model นี้</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Search input */}
                  <div className="relative mb-2">
                    <input
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="🔍 ค้นหา model... (เช่น claude, gemini, gpt, free)"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    {modelSearch && (
                      <button
                        onClick={() => setModelSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >✕</button>
                    )}
                  </div>

                  {/* Model list */}
                  <div className="max-h-64 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    {models
                      .filter((m) => {
                        if (!modelSearch.trim()) return true;
                        const q = modelSearch.toLowerCase();
                        return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
                      })
                      .map((m) => {
                        const isSelected = form.model === m.id;
                        const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                        const isRec = tmpl?.recommendedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => { setForm((f) => ({ ...f, model: m.id })); setModelSearch(""); }}
                            className="w-full text-left px-3 py-2 border-b last:border-b-0 transition-all flex items-center gap-2"
                            style={{
                              borderColor: "var(--border)",
                              background: isSelected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold" style={{ color: isSelected ? "var(--accent)" : "var(--text)" }}>
                                {m.name}
                              </span>
                              <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>
                                {(m.contextWindow / 1000).toFixed(0)}K
                              </span>
                            </div>
                            {isRec && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                                💡 แนะนำ
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs flex-shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    {models.length === 0 && (
                      <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                        กำลังโหลด models...
                      </div>
                    )}
                  </div>

                  {/* Selected model display */}
                  {form.model && (
                    <div className="mt-2 text-xs px-3 py-2 rounded-lg border flex items-center gap-2" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                      <span>✓ เลือกแล้ว:</span>
                      <span className="font-bold">{models.find((m) => m.id === form.model)?.name || form.model}</span>
                      {(() => {
                        const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                        if (tmpl?.recommendedModel && form.model !== tmpl.recommendedModel) {
                          return <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>(ไม่ใช่ model ที่แนะนำ)</span>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Basic Info + API Key ── */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>กรอกข้อมูลพื้นฐานของ Agent</p>

                  {/* API Key */}
                  <div className="p-4 rounded-xl border-2" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>🔑 API Key</div>
                    <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
                      สมัครฟรีที่ <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>openrouter.ai/keys</a> — API Key เดียวใช้ได้ทุก model
                      {editingId && <span> (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
                    </div>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                      placeholder={editingId ? "••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "sk-or-v1-xxx..."}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  </div>

                  {/* Name + Emoji + Role */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="w-20">
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
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Role *</label>
                      <input
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        placeholder="เช่น CEO / Strategic Advisor"
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  </div>

                  {/* Soul */}
                  <div>
                    <label className="text-xs mb-1 block font-bold" style={{ color: "var(--text-muted)" }}>
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
              )}

              {/* ── Step 3: Advanced Settings ── */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>ตั้งค่าเพิ่มเติม (ไม่บังคับ — ข้ามได้ถ้าไม่ต้องการปรับ)</p>

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
                </div>
              )}

            </div>

            {/* Footer: Navigation Buttons */}
            <div className="flex-shrink-0 p-4 sm:p-6 pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => formStep === 0 ? setShowForm(false) : setFormStep(formStep - 1)}
                className="px-4 py-2 rounded-lg text-sm border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                {formStep === 0 ? "ยกเลิก" : "← ย้อนกลับ"}
              </button>
              <div className="flex gap-2">
                {formStep < 3 ? (
                  <>
                    {formStep === 2 && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm border transition-all disabled:opacity-50"
                        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      >
                        {saving ? "Saving..." : editingId ? "บันทึกเลย" : "สร้างเลย"}
                      </button>
                    )}
                    <button
                      onClick={() => setFormStep(formStep + 1)}
                      className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      ถัดไป →
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    {saving ? "Saving..." : editingId ? "Update Agent" : "✨ Create Agent"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Knowledge Modal ─── */}
      {knowledgeAgentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>📚 ฐานความรู้ — {knowledgeAgentName}</h3>
              <button onClick={() => { setKnowledgeAgentId(null); setKnowledgePreview(null); }} className="text-xl" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Upload */}
            <div className="mb-4">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                <span className="text-sm font-bold">{knowledgeUploading ? "กำลังอัพโหลด..." : "📎 อัพโหลดไฟล์ความรู้"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.docx,.txt,.md,.csv,.json"
                  disabled={knowledgeUploading}
                  onChange={handleKnowledgeUpload}
                />
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>รองรับ: xlsx, pdf, docx, txt, md, csv, json (สูงสุด 10MB)</p>
            </div>

            {/* Preview after upload */}
            {knowledgePreview && (
              <div className="mb-4 p-3 rounded-lg border text-xs" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)", color: "var(--text-muted)" }}>
                <div className="font-bold mb-1" style={{ color: "var(--accent)" }}>✅ อัพโหลดสำเร็จ: {knowledgePreview.filename}</div>
                <div>ขนาดโดยประมาณ: ~{knowledgePreview.tokens.toLocaleString()} tokens</div>
                {knowledgePreview.preview && <div className="mt-2 whitespace-pre-wrap line-clamp-4">{knowledgePreview.preview}</div>}
              </div>
            )}

            {/* File List */}
            {knowledgeFiles.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
                ยังไม่มีไฟล์ความรู้ — อัพโหลดไฟล์เพื่อให้ Agent มีบริบทเฉพาะทาง
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                  ไฟล์ทั้งหมด {knowledgeFiles.length} ไฟล์ · ~{knowledgeFiles.reduce((s: number, f: any) => s + (f.tokens || 0), 0).toLocaleString()} tokens
                </div>
                {knowledgeFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ~{(f.tokens || 0).toLocaleString()} tokens · {new Date(f.uploadedAt).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleKnowledgeDelete(f.id)}
                      className="ml-3 px-2 py-1 rounded text-xs border transition-all hover:opacity-80"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setKnowledgeAgentId(null); setKnowledgePreview(null); }}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
