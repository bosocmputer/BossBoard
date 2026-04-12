import { NextRequest } from "next/server";
import {
  listAgents,
  getAgentApiKey,
  getSettings,
  createResearchSession,
  appendResearchMessage,
  completeResearchSession,
  ResearchMessage,
  AgentPublic,
  updateAgentStats,
  incrementAgentSessionCount,
  getCompanyInfoContext,
  getAgentKnowledgeContent,
} from "@/lib/agents-store";
import crypto from "crypto";

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function callLLM(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string | undefined,
  messages: LLMMessage[]
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  if (provider === "anthropic") {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: userMsgs,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? "",
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  if (provider === "openrouter") {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://bossboard",
        "X-Title": "BossBoard",
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  if (provider === "openai" || provider === "custom") {
    const url = baseUrl ? `${baseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_tokens: 4096 }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        contents: userMsgs.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  if (provider === "ollama") {
    const url = baseUrl ? `${baseUrl}/api/chat` : "http://localhost:11434/api/chat";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.message?.content ?? "",
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// Fetch MCP tools and call relevant ones for context
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

// Infer arguments for a tool from its name + description when no inputSchema available
function buildToolArguments(tool: McpTool, question: string): Record<string, unknown> {
  const name = tool.name;

  // Tools that need keyword/search param
  if (["search_product", "search_customer", "search_supplier"].includes(name)) {
    return { keyword: question };
  }

  // Sales analytics tools — use date range (last 1 year) + optional question as keyword
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  if (["get_sales_summary", "get_sales_item_detail", "get_sales_by_item",
       "get_new_customer_trend", "get_dso_analysis", "get_sales_conversion_rate",
       "get_customer_purchase_frequency", "get_salesman_crm_kpi",
       "get_sales_by_area"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, response_format: "markdown" };
  }

  if (["get_sales_by_customer", "get_sales_by_salesman", "get_sales_by_branch",
       "get_sales_by_dimension"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, response_format: "markdown" };
  }

  if (["get_customer_rfm", "get_customer_activity_status"].includes(name)) {
    return { months: 12, response_format: "markdown" };
  }

  if (["get_customer_profitability", "get_item_top_buyers", "get_customer_top_items"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, limit: 10, response_format: "markdown" };
  }

  if (["get_customer_segment_summary"].includes(name)) {
    return { period_months: 12, response_format: "markdown" };
  }

  if (["get_ar_aging", "get_customer_credit_status"].includes(name)) {
    return { response_format: "markdown" };
  }

  // stock/inventory tools
  if (["get_stock_balance", "get_product_price",
       "get_account_incoming", "get_account_outstanding", "get_bookout_balance"].includes(name)) {
    return { keyword: question };
  }

  // Use inputSchema if available
  const props = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const paramNames = required.length > 0 ? required : Object.keys(props);
  const args: Record<string, unknown> = {};
  for (const key of paramNames) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === "string") { args[key] = question; break; }
  }
  if (Object.keys(args).length === 0) {
    for (const k of ["keyword", "query", "search", "q", "text"]) {
      if (k in props) { args[k] = question; break; }
    }
  }
  return args;
}

async function fetchMcpContext(mcpEndpoint: string, mcpAccessMode: string, question: string): Promise<string> {
  // Normalize endpoint — strip trailing slash and known MCP paths
  const base = mcpEndpoint.replace(/\/(health|tools|call|mcp|sse)\/?$/, "").replace(/\/$/, "");
  try {
    // Get available tools with full schema
    const toolsRes = await fetch(`${base}/tools`, {
      headers: { "mcp-access-mode": mcpAccessMode },
      signal: AbortSignal.timeout(6000),
    });
    if (!toolsRes.ok) return "";
    const toolsData = await toolsRes.json();
    const tools: McpTool[] = Array.isArray(toolsData) ? toolsData : (toolsData.tools ?? []);
    if (tools.length === 0) return "";

    // Skip write/create tools and fallback — only use read/search tools
    const SKIP_TOOLS = ["create_sale_reserve", "fallback_response"];
    const READ_TOOL_PREFIXES = ["get_", "search_", "list_", "find_", "fetch_", "query_"];
    const readTools = tools.filter((t) =>
      !SKIP_TOOLS.includes(t.name) &&
      READ_TOOL_PREFIXES.some((p) => t.name.startsWith(p))
    );
    if (readTools.length === 0) return "";

    // Score tools by relevance: match question words against tool name + description
    const q = question.toLowerCase();
    const qWords = q.split(/[\s,]+/).filter((w) => w.length > 1);

    // Keyword groups → preferred tool prefixes/names
    const SALES_KEYWORDS = ["ยอดขาย", "sales", "ขาย", "revenue", "วิเคราะห์ยอด", "รายได้", "sale"];
    const CUSTOMER_KEYWORDS = ["ลูกค้า", "customer", "rfm", "crm", "debt", "ar", "aging"];
    const STOCK_KEYWORDS = ["สต็อก", "สินค้า", "stock", "inventory", "product", "item", "คงเหลือ"];

    const hasSalesIntent = SALES_KEYWORDS.some((k) => q.includes(k));
    const hasCustomerIntent = CUSTOMER_KEYWORDS.some((k) => q.includes(k));
    const hasStockIntent = STOCK_KEYWORDS.some((k) => q.includes(k));

    const scored = readTools.map((t) => {
      const text = `${t.name.replace(/_/g, " ")} ${t.description ?? ""}`.toLowerCase();
      let score = qWords.filter((w) => text.includes(w)).length;

      // Boost analytical/summary tools when question has clear intent
      if (hasSalesIntent && t.name.startsWith("get_sales")) score += 5;
      if (hasCustomerIntent && (t.name.startsWith("get_customer") || t.name.startsWith("get_ar") || t.name.startsWith("get_dso"))) score += 5;
      if (hasStockIntent && t.name.startsWith("get_stock")) score += 5;

      // Penalize generic search tools when intent is clearly analytics
      if ((hasSalesIntent || hasCustomerIntent || hasStockIntent) &&
          ["search_product", "search_customer", "search_supplier"].includes(t.name)) {
        score = Math.max(0, score - 3);
      }

      return { tool: t, score };
    }).sort((a, b) => b.score - a.score);

    // Take top 3 tools — always include at least 1 even if score=0
    const topTools = scored.slice(0, 3).map((s) => s.tool);

    const results: string[] = [];
    for (const tool of topTools) {
      try {
        const args = buildToolArguments(tool, question);
        const callRes = await fetch(`${base}/call`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "mcp-access-mode": mcpAccessMode,
          },
          body: JSON.stringify({ name: tool.name, arguments: args }),
          signal: AbortSignal.timeout(8000),
        });
        if (!callRes.ok) continue;
        const callData = await callRes.json();
        // MCP /call returns { content: [{ type: "text", text: "..." }] }
        let text = "";
        if (callData?.content && Array.isArray(callData.content)) {
          text = callData.content.map((c: { text?: string }) => c.text ?? "").join("\n");
        } else {
          text = typeof callData === "string" ? callData : JSON.stringify(callData);
        }
        if (text && text.trim().length > 10) {
          results.push(`[${tool.name}]\n${text.slice(0, 2000)}`);
        }
      } catch { /* skip failed tool */ }
    }

    return results.length > 0
      ? `\n\n---\n🔌 ข้อมูลจาก MCP Server (${base}) — role: ${mcpAccessMode}:\n${results.join("\n\n")}\n---\n`
      : "";
  } catch {
    return "";
  }
}

// Web search via Serper → SerpApi fallback
async function webSearch(query: string, serperKey?: string, serpApiKey?: string): Promise<string> {
  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "content-type": "application/json" },
        body: JSON.stringify({ q: query, num: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.organic ?? []).slice(0, 5).map((r: { title: string; link: string; snippet: string }, i: number) =>
          `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
        );
        return results.join("\n\n");
      }
    } catch { /* fall through */ }
  }

  if (serpApiKey) {
    try {
      const params = new URLSearchParams({ q: query, api_key: serpApiKey, engine: "google", num: "5" });
      const res = await fetch(`https://serpapi.com/search?${params}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const results = (data.organic_results ?? []).slice(0, 5).map((r: { title: string; link: string; snippet: string }, i: number) =>
          `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
        );
        return results.join("\n\n");
      }
    } catch { /* ignore */ }
  }

  return "";
}

// Detect chairman from role seniority
const CHAIRMAN_ROLES = ["ceo", "chief executive", "president", "md", "managing director", "chairman", "director", "vp", "vice president", "cfo", "coo", "cto", "cmo", "chro"];

function detectChairman(agents: AgentPublic[]): AgentPublic {
  // Use explicit seniority if set
  const sorted = [...agents].sort((a, b) => {
    const sa = a.seniority ?? 99;
    const sb = b.seniority ?? 99;
    if (sa !== sb) return sa - sb;
    // Fall back to role keyword matching
    const ra = a.role.toLowerCase();
    const rb = b.role.toLowerCase();
    const ia = CHAIRMAN_ROLES.findIndex((k) => ra.includes(k));
    const ib = CHAIRMAN_ROLES.findIndex((k) => rb.includes(k));
    const scoreA = ia === -1 ? 999 : ia;
    const scoreB = ib === -1 ? 999 : ib;
    return scoreA - scoreB;
  });
  return sorted[0];
}

// Sort agents by speaking order (chairman first and last, others by seniority)
function sortBySeniority(agents: AgentPublic[], chairman: AgentPublic): AgentPublic[] {
  const others = agents
    .filter((a) => a.id !== chairman.id)
    .sort((a, b) => {
      const sa = a.seniority ?? 50;
      const sb = b.seniority ?? 50;
      if (sa !== sb) return sa - sb;
      const ra = a.role.toLowerCase();
      const rb = b.role.toLowerCase();
      const ia = CHAIRMAN_ROLES.findIndex((k) => ra.includes(k));
      const ib = CHAIRMAN_ROLES.findIndex((k) => rb.includes(k));
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  return [chairman, ...others];
}

function sseEvent(encoder: TextEncoder, event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

interface ConversationTurn {
  question: string;
  answer: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    question,
    agentIds,
    dataSource,
    mcpEndpoint,
    dbConnectionString,
    conversationHistory,
    fileContexts,
    historyMode = "full", // "full" | "summary" | "last3" | "none"
    disableMcp = false,
    mode = "full", // "full" | "discuss" | "close"
    sessionId: existingSessionId,
    allRounds,
  } = body as {
    question: string;
    agentIds: string[];
    dataSource?: string;
    mcpEndpoint?: string;
    dbConnectionString?: string;
    conversationHistory?: ConversationTurn[];
    fileContexts?: { filename: string; meta: string; context: string; sheets?: string[] }[];
    historyMode?: "full" | "summary" | "last3" | "none";
    disableMcp?: boolean;
    mode?: "full" | "discuss" | "close";
    sessionId?: string;
    allRounds?: { question: string; messages: { agentEmoji: string; agentName: string; role: string; content: string }[] }[];
  };

  if (!question || !agentIds?.length) {
    return new Response(JSON.stringify({ error: "Missing question or agentIds" }), { status: 400 });
  }

  const allAgents = listAgents();
  const selectedAgents = allAgents.filter((a) => agentIds.includes(a.id) && a.active);
  if (!selectedAgents.length) {
    return new Response(JSON.stringify({ error: "No active agents found" }), { status: 400 });
  }

  // Load web search keys from settings
  const settings = getSettings();
  const serperKey = settings.serperApiKey;
  const serpApiKeyVal = settings.serpApiKey;

  // Fetch extra context from data source before streaming
  let dataSourceContext = "";
  if (dataSource === "mcp" && mcpEndpoint) {
    try {
      const mcpRes = await fetch(mcpEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: question }),
        signal: AbortSignal.timeout(8000),
      });
      if (mcpRes.ok) {
        const mcpData = await mcpRes.json();
        const mcpText = typeof mcpData === "string" ? mcpData : JSON.stringify(mcpData).slice(0, 4000);
        dataSourceContext = `\n\n[MCP Context from ${mcpEndpoint}]:\n${mcpText}`;
      }
    } catch {
      dataSourceContext = `\n\n[MCP endpoint ${mcpEndpoint} did not respond — proceeding without context]`;
    }
  } else if (dataSource === "database" && dbConnectionString) {
    const safeConn = dbConnectionString.replace(/:[^:@]+@/, ":***@");
    dataSourceContext = `\n\n[Database Context]: Connection configured at ${safeConn}.`;
  }

  // Build history context based on historyMode
  function buildHistoryContext(history?: ConversationTurn[]): string {
    if (!history || history.length === 0) return "";
    let turns = history;
    if (historyMode === "none") return "";
    if (historyMode === "last3") turns = history.slice(-3);
    if (historyMode === "summary") {
      // Summarize: just questions + first 200 chars of answers
      return `\n\n---\nสรุปประวัติการประชุมก่อนหน้า:\n${turns.map((t, i) => `[วาระที่ ${i + 1}] ${t.question}\nสรุป: ${t.answer.slice(0, 200)}...`).join("\n\n")}\n---\n`;
    }
    return `\n\n---\nประวัติการประชุมก่อนหน้า:\n${turns.map((t, i) => `[วาระที่ ${i + 1}] คำถาม: ${t.question}\nสรุปมติ: ${t.answer}`).join("\n\n")}\n---\n`;
  }

  // Build file context (with optional sheet filter)
  function buildFileContext(contexts?: { filename: string; meta: string; context: string; sheets?: string[] }[]): string {
    if (!contexts || contexts.length === 0) return "";
    return `\n\n---\n📎 เอกสารอ้างอิงที่แนบมา (ใช้ข้อมูลเหล่านี้ประกอบการวิเคราะห์):\n${contexts.map((f) => `[${f.meta}]\n${f.context}`).join("\n\n---\n")}\n---\n`;
  }

  let sessionId: string;
  if (existingSessionId) {
    // Reuse existing session (multi-round meeting)
    sessionId = existingSessionId;
  } else {
    const newSession = createResearchSession({ question, agentIds, dataSource });
    sessionId = newSession.id;
    // Increment session count only on first round
    for (const aid of agentIds) {
      incrementAgentSessionCount(aid);
    }
  }

  // Detect chairman
  const chairman = detectChairman(selectedAgents);
  const orderedAgents = sortBySeniority(selectedAgents, chairman);

  // Company & knowledge context
  const companyContext = getCompanyInfoContext();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(sseEvent(encoder, event, data));
      };

      send("session", { sessionId });
      send("chairman", { agentId: chairman.id, name: chairman.name, emoji: chairman.emoji, role: chairman.role });
      send("status", { message: `🏛️ ประธาน: ${chairman.emoji} ${chairman.name} (${chairman.role}) — ${mode === "close" ? "สรุปมติที่ประชุม" : "เปิดการประชุม"}` });

      const agentFindings: { agentId: string; name: string; emoji: string; role: string; content: string; searchResults?: string }[] = [];
      const agentTokens: Record<string, { input: number; output: number }> = {};
      const failedAgents: string[] = [];
      let silentAgents: string[] = [];

      const historyContext = buildHistoryContext(conversationHistory);
      const fileContext = buildFileContext(fileContexts);

      // === Phase 1 + 2: Discussion (skip in "close" mode) ===
      if (mode !== "close") {

      // Chairman opens the meeting
      {
        const apiKey = getAgentApiKey(chairman.id);
        if (apiKey) {
          try {
            const openingResult = await callLLM(chairman.provider, chairman.model, apiKey, chairman.baseUrl, [
              {
                role: "system",
                content: `${companyContext}${chairman.soul}${dataSourceContext}${historyContext}${fileContext}\n\nคุณเป็นประธานการประชุม มีหน้าที่เปิดประชุม กำหนดวาระ และนำทีมหาข้อสรุป`,
              },
              {
                role: "user",
                content: `กรุณาเปิดการประชุมสำหรับวาระ: "${question}"\n\nชี้แจงวัตถุประสงค์สั้นกระชับ (3-5 ประโยค) และกำหนดประเด็นหลัก 2-3 ข้อที่ต้องการหาคำตอบ เพื่อให้ทีมงานวิเคราะห์ในทิศทางเดียวกัน\n\n⚠️ สำคัญ: พูดกระชับ ไม่ต้องอธิบายรายละเอียดยาว เพราะทีมจะนำเสนอข้อมูลเชิงลึกเอง`,
              },
            ]);

            const openingMsg: ResearchMessage = {
              id: crypto.randomUUID(),
              agentId: chairman.id,
              agentName: chairman.name,
              agentEmoji: chairman.emoji,
              role: "thinking",
              content: `🏛️ **เปิดการประชุม**\n\n${openingResult.content}`,
              tokensUsed: openingResult.inputTokens + openingResult.outputTokens,
              timestamp: new Date().toISOString(),
            };
            appendResearchMessage(sessionId, openingMsg);
            send("message", openingMsg);
            agentTokens[chairman.id] = { input: openingResult.inputTokens, output: openingResult.outputTokens };
          } catch { /* skip opening if error */ }
        }
      }

      // Phase 1: Each agent presents their analysis (in seniority order, chairman speaks after opening)
      send("status", { message: "📋 Phase 1 — แต่ละผู้เชี่ยวชาญนำเสนอมุมมองตามบทบาท" });

      for (const agent of orderedAgents) {
        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: agent.id === chairman.id });

        try {
          const apiKey = getAgentApiKey(agent.id);
          if (!apiKey) {
            send("agent_error", { agentId: agent.id, error: "No API key configured" });
            continue;
          }

          // MCP context if agent has endpoint configured and not disabled by user
          let mcpContext = "";
          if (!disableMcp && agent.mcpEndpoint) {
            mcpContext = await fetchMcpContext(agent.mcpEndpoint, agent.mcpAccessMode ?? "general", question);
          }

          // Web search if agent has it enabled
          let searchContext = "";
          if (agent.useWebSearch && (serperKey || serpApiKeyVal)) {
            send("agent_searching", { agentId: agent.id, query: question });
            const searchResults = await webSearch(question, serperKey, serpApiKeyVal);
            if (searchResults) {
              searchContext = `\n\n🔍 ผลการค้นหาเพิ่มเติมจากอินเทอร์เน็ต:\n${searchResults}\n`;
            }
          }

          const thinkingMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "thinking",
            content: `กำลังวิเคราะห์: "${question}"${agent.useWebSearch ? " (พร้อมข้อมูลจากอินเทอร์เน็ต)" : ""}`,
            tokensUsed: 0,
            timestamp: new Date().toISOString(),
          };
          appendResearchMessage(sessionId, thinkingMsg);
          send("message", thinkingMsg);

          const isChairman = agent.id === chairman.id;
          const roleInstruction = isChairman
            ? `คุณเป็นประธานการประชุม นำเสนอมุมมองจากตำแหน่ง ${agent.role} ของคุณ`
            : `นำเสนอมุมมองจากมุมมองของ ${agent.role} อย่างชัดเจนและตรงประเด็น`;

          // Build context of previous agents' findings to avoid repetition
          let previousFindingsContext = "";
          if (agentFindings.length > 0) {
            const summaries = agentFindings.map((f) =>
              `[${f.emoji} ${f.name} — ${f.role}]: ${f.content.slice(0, 600)}${f.content.length > 600 ? "..." : ""}`
            ).join("\n\n");
            previousFindingsContext = `\n\n---\n⚠️ ผู้เชี่ยวชาญก่อนหน้าได้นำเสนอไปแล้ว (สรุปย่อ):\n${summaries}\n\n❌ ห้ามพูดซ้ำสิ่งที่คนอื่นพูดไปแล้ว ห้ามสร้างตารางเปรียบเทียบภาพรวมซ้ำ\n✅ ให้เสริมเฉพาะมุมมองใหม่ ข้อสังเกตใหม่ ความเสี่ยงใหม่ จากบทบาท ${agent.role} ของคุณเท่านั้น\n---\n`;
          }

          const knowledgeContext = getAgentKnowledgeContent(agent.id);
          const result = await callLLM(agent.provider, agent.model, apiKey, agent.baseUrl, [
            {
              role: "system",
              content: `${companyContext}${agent.soul}${knowledgeContext}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${previousFindingsContext}`,
            },
            {
              role: "user",
              content: `วาระการประชุม: ${question}\n\n${roleInstruction}\n\nกรุณาวิเคราะห์เชิงลึกจากมุมมองเฉพาะทางของ ${agent.role} พร้อมระบุ:\n1. ประเด็นสำคัญที่คนอื่นยังไม่ได้พูดถึง\n2. ความเสี่ยงหรือข้อกังวลจากมุมมองของคุณ\n3. ข้อเสนอแนะเฉพาะทาง${fileContexts?.length ? "\n\nอ้างอิงข้อมูลจากเอกสารที่แนบมาด้วย" : ""}\n\n⚠️ เน้นวิเคราะห์เชิงลึกเฉพาะบทบาทของคุณ ไม่ต้องสรุปภาพรวมหรือสร้างตารางเปรียบเทียบทั่วไปที่คนอื่นทำแล้ว`,
            },
          ]);

          const prevTokens = agentTokens[agent.id] ?? { input: 0, output: 0 };
          agentTokens[agent.id] = {
            input: prevTokens.input + result.inputTokens,
            output: prevTokens.output + result.outputTokens,
          };

          const findingMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "finding",
            content: result.content,
            tokensUsed: result.inputTokens + result.outputTokens,
            timestamp: new Date().toISOString(),
          };
          appendResearchMessage(sessionId, findingMsg);
          send("message", findingMsg);
          send("agent_tokens", {
            agentId: agent.id,
            inputTokens: agentTokens[agent.id].input,
            outputTokens: agentTokens[agent.id].output,
            totalTokens: agentTokens[agent.id].input + agentTokens[agent.id].output,
          });
          updateAgentStats(agent.id, result.inputTokens, result.outputTokens);

          agentFindings.push({
            agentId: agent.id,
            name: agent.name,
            emoji: agent.emoji,
            role: agent.role,
            content: result.content,
            searchResults: searchContext || undefined,
          });
        } catch (err) {
          const errorDetail = String(err);
          send("agent_error", { agentId: agent.id, error: errorDetail });
          failedAgents.push(`${agent.emoji} ${agent.name} (${agent.role})`);

          // Send a visible error message so user knows this agent failed
          const errorMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "finding",
            content: `⚠️ ไม่สามารถวิเคราะห์ได้ — เกิดข้อผิดพลาดในการเชื่อมต่อกับ model ${agent.model} (${agent.provider})\n\nข้อผิดพลาด: ${errorDetail.slice(0, 200)}`,
            tokensUsed: 0,
            timestamp: new Date().toISOString(),
          };
          appendResearchMessage(sessionId, errorMsg);
          send("message", errorMsg);
        }
      }

      // Phase 2: Cross-discussion — agents respond to each other based on their actual soul/role
      if (agentFindings.length > 1) {
        send("status", { message: "💬 Phase 2 — อภิปรายแลกเปลี่ยนความเห็น (ตามบทบาทจริง)" });

        for (let i = 0; i < orderedAgents.length; i++) {
          const agent = orderedAgents[i];
          const apiKey = getAgentApiKey(agent.id);
          if (!apiKey) continue;

          // Summarize other agents' findings (max 500 chars each to reduce tokens)
          const otherFindings = agentFindings
            .filter((f) => f.agentId !== agent.id)
            .map((f) => `[${f.emoji} ${f.name} — ${f.role}]:\n${f.content.slice(0, 500)}${f.content.length > 500 ? "..." : ""}`)
            .join("\n\n---\n\n");

          const myFinding = agentFindings.find((f) => f.agentId === agent.id);
          if (!myFinding) continue;

          try {
            const knowledgeCtx = getAgentKnowledgeContent(agent.id);
            const result = await callLLM(agent.provider, agent.model, apiKey, agent.baseUrl, [
              {
                role: "system",
                content: `${companyContext}${agent.soul}${knowledgeCtx}\n\nคุณกำลังอยู่ในวงอภิปราย จงแสดงความเห็นตามบทบาท ${agent.role} ของคุณอย่างตรงไปตรงมา\n\n⚠️ กฎเหล็กของการอภิปราย:\n1. ห้ามพูดแค่ "เห็นด้วย" โดยไม่มีเนื้อหาใหม่ — ถ้าเห็นด้วยต้องเสริมมุมมองใหม่ที่คนอื่นยังไม่ได้พูด\n2. คุณต้องระบุอย่างน้อย 1 จุดที่ไม่เห็นด้วยหรือมีข้อกังวล พร้อมเหตุผลจากประสบการณ์ในบทบาท ${agent.role}\n3. คุณต้องชี้อย่างน้อย 1 ความเสี่ยงหรือข้อควรระวังที่คนอื่นอาจมองข้าม\n4. พูดกระชับ เน้นเฉพาะจุดที่ต่างจากคนอื่น ไม่ต้องสรุปซ้ำสิ่งที่ทุกคนเห็นตรงกันแล้ว`,
              },
              {
                role: "user",
                content: `วาระ: ${question}\n\nสรุปมุมมองของคุณ:\n${myFinding.content.slice(0, 500)}${myFinding.content.length > 500 ? "..." : ""}\n\n---\nมุมมองจากสมาชิกคนอื่น:\n${otherFindings}\n\n---\nในฐานะ ${agent.role}:\n1. ระบุจุดที่คุณไม่เห็นด้วยกับใคร เพราะอะไร?\n2. มีความเสี่ยงอะไรที่คนอื่นมองข้าม?\n3. มีข้อเสนอเพิ่มเติมจากมุมมอง ${agent.role} ของคุณไหม?`,
              },
            ]);

            const tokens = agentTokens[agent.id] ?? { input: 0, output: 0 };
            agentTokens[agent.id] = {
              input: tokens.input + result.inputTokens,
              output: tokens.output + result.outputTokens,
            };

            const chatMsg: ResearchMessage = {
              id: crypto.randomUUID(),
              agentId: agent.id,
              agentName: agent.name,
              agentEmoji: agent.emoji,
              role: "chat",
              content: result.content,
              tokensUsed: result.inputTokens + result.outputTokens,
              timestamp: new Date().toISOString(),
            };
            appendResearchMessage(sessionId, chatMsg);
            send("message", chatMsg);
            send("agent_tokens", {
              agentId: agent.id,
              inputTokens: agentTokens[agent.id].input,
              outputTokens: agentTokens[agent.id].output,
              totalTokens: agentTokens[agent.id].input + agentTokens[agent.id].output,
            });
            updateAgentStats(agent.id, result.inputTokens, result.outputTokens);
          } catch (err) {
            send("agent_error", { agentId: agent.id, error: String(err) });
            failedAgents.push(`${agent.emoji} ${agent.name} (${agent.role})`);
          }
        }
      }

      // Track agents that had no findings (failed in Phase 1)
      const respondedAgentIds = new Set(agentFindings.map((f) => f.agentId));
      silentAgents = orderedAgents
        .filter((a) => !respondedAgentIds.has(a.id))
        .map((a) => `${a.emoji} ${a.name} (${a.role})`);

      } // end if (mode !== "close") — Phase 1+2

      // === Phase 3: Chairman synthesis (skip in "discuss" mode) ===
      if (mode !== "discuss") {

      send("status", { message: "🏛️ Phase 3 — ประธานสรุปมติและ Action Items" });

      const chairApiKey = getAgentApiKey(chairman.id);

      // Build allContext from either current round findings or all rounds (close mode)
      let allContext = "";
      if (mode === "close" && allRounds && allRounds.length > 0) {
        // Close mode: synthesize from all accumulated rounds
        allContext = allRounds.map((round: { question: string; messages: { agentEmoji: string; agentName: string; role: string; content: string }[] }, i: number) => {
          const msgs = (round.messages ?? [])
            .filter((m: { role: string }) => m.role !== "thinking")
            .map((m: { agentEmoji: string; agentName: string; role: string; content: string }) => `[${m.agentEmoji} ${m.agentName} — ${m.role}]:\n${m.content}`)
            .join("\n\n");
          return `=== วาระที่ ${i + 1}: ${round.question} ===\n${msgs}`;
        }).join("\n\n---\n\n");
      } else {
        // Full/default mode: use current round findings
        allContext = agentFindings
          .map((f) => `[${f.emoji} ${f.name} — ${f.role}]:\n${f.content}`)
          .join("\n\n---\n\n");
      }

      if (chairApiKey && allContext.length > 0) {
        try {
          // Build awareness of agent failures for synthesis
          let failureNote = "";
          if (silentAgents.length > 0 || failedAgents.length > 0) {
            const allFailed = [...new Set([...silentAgents, ...failedAgents])];
            failureNote = `\n\n⚠️ หมายเหตุ: ผู้เชี่ยวชาญต่อไปนี้ไม่สามารถนำเสนอข้อมูลได้ในการประชุมนี้: ${allFailed.join(", ")} — ให้ระบุในรายงานว่ายังขาดมุมมองจากตำแหน่งเหล่านี้ และอาจต้องประชุมเพิ่มเติม`;
          }

          const result = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
            {
              role: "system",
              content: `${companyContext}คุณเป็นประธานการประชุมในบทบาท ${chairman.role} มีหน้าที่สรุปมติที่ประชุมให้ชัดเจน ถูกต้อง ครบถ้วน${mode === "close" && allRounds && allRounds.length > 1 ? ` (การประชุมนี้มี ${allRounds.length} วาระ สรุปรวมทั้งหมด)` : ""}${failureNote}`,
            },
            {
              role: "user",
              content: `${mode === "close" && allRounds && allRounds.length > 1 ? `การประชุมครั้งนี้มี ${allRounds.length} วาระที่อภิปราย:\n\n` : `วาระ: ${question}\n\n`}ความเห็นจากทีมที่ปรึกษา:\n\n${allContext}\n\n---\nกรุณาสรุปเป็นรายงานการประชุมที่มี:\n1. **ประเด็นที่ที่ประชุมเห็นพ้องกัน** — สิ่งที่ทุกฝ่ายเห็นตรงกัน\n2. **ประเด็นที่ยังมีความเห็นต่าง** — ระบุชัดเจนว่าใครเห็นต่างอย่างไร พร้อมเหตุผลแต่ละฝ่าย\n3. **มติที่ประชุม** — ข้อสรุปที่ดีที่สุดพร้อมเหตุผลที่หนักแน่น\n4. **Action Items** — สิ่งที่ต้องดำเนินการต่อ (ระบุผู้รับผิดชอบตาม role)\n5. **ข้อจำกัดและสิ่งที่ต้องตรวจสอบเพิ่มเติม** — ข้อมูลที่ยังขาดหรือต้องยืนยัน\n\n⚠️ สำคัญ: ข้อมูลตัวเลขทุกตัวที่อ้างอิงในรายงานต้องถูกต้องตรงกับข้อมูลต้นฉบับ ห้ามปัดเศษหรือประมาณค่า\n\nจากนั้นให้เพิ่มบรรทัดสุดท้ายเป็น JSON สำหรับ visualization ในรูปแบบ:\n\`\`\`chart\n{"type":"bar|line|pie|none","title":"...","labels":[...],"datasets":[{"label":"...","data":[...]}]}\n\`\`\`\nถ้าไม่มีข้อมูลตัวเลขที่เหมาะกับกราฟ ให้ใส่ type: "none"`,
            },
          ]);

          const synthMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: chairman.id,
            agentName: chairman.name,
            agentEmoji: chairman.emoji,
            role: "synthesis",
            content: result.content,
            tokensUsed: result.inputTokens + result.outputTokens,
            timestamp: new Date().toISOString(),
          };
          appendResearchMessage(sessionId, synthMsg);
          send("message", synthMsg);

          // Parse chart data from synthesis
          const chartMatch = result.content.match(/```chart\n([\s\S]*?)\n```/);
          if (chartMatch) {
            try {
              const chartData = JSON.parse(chartMatch[1]);
              if (chartData.type && chartData.type !== "none") {
                send("chart_data", chartData);
              }
            } catch { /* ignore chart parse error */ }
          }

          send("final_answer", { content: result.content });
          completeResearchSession(sessionId, result.content, "completed");

          // Update chairman tokens
          const prevTokens = agentTokens[chairman.id] ?? { input: 0, output: 0 };
          agentTokens[chairman.id] = {
            input: prevTokens.input + result.inputTokens,
            output: prevTokens.output + result.outputTokens,
          };
          send("agent_tokens", {
            agentId: chairman.id,
            inputTokens: agentTokens[chairman.id].input,
            outputTokens: agentTokens[chairman.id].output,
            totalTokens: agentTokens[chairman.id].input + agentTokens[chairman.id].output,
          });
          updateAgentStats(chairman.id, result.inputTokens, result.outputTokens);

          // Generate follow-up suggestions
          try {
            const historyForFollowup = conversationHistory && conversationHistory.length > 0
              ? `ประวัติวาระก่อนหน้า:\n${conversationHistory.map((t, i) => `วาระที่ ${i + 1}: ${t.question}`).join("\n")}\n\n`
              : "";
            const followupResult = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
              {
                role: "system",
                content: "คุณช่วยแนะนำวาระการประชุมต่อเนื่องที่น่าสนใจ ตอบในรูปแบบ JSON array เท่านั้น เช่น [\"วาระ 1\", \"วาระ 2\", \"วาระ 3\"]",
              },
              {
                role: "user",
                content: `${historyForFollowup}วาระล่าสุด: ${question}\n\nมติที่ประชุม: ${result.content.slice(0, 500)}\n\nแนะนำ 3 วาระต่อเนื่องที่ควรพิจารณาต่อ ตอบเป็น JSON array เท่านั้น ไม่ต้องมีข้อความอื่น`,
              },
            ]);
            try {
              const jsonMatch = followupResult.content.match(/\[[\s\S]*\]/);
              const suggestions: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
              if (suggestions.length > 0) {
                send("follow_up_suggestions", { suggestions: suggestions.slice(0, 3) });
              }
            } catch { /* ignore */ }
          } catch { /* ignore */ }

        } catch (err) {
          completeResearchSession(sessionId, String(err), "error");
          send("error", { message: String(err) });
        }
      } else if (mode !== "close") {
        // Only auto-complete for "full" mode when no chairman API key
        completeResearchSession(sessionId, agentFindings[0]?.content ?? "", "completed");
        send("final_answer", { content: agentFindings[0]?.content ?? "" });
      }

      } // end if (mode !== "discuss") — Phase 3

      send("done", { sessionId });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
