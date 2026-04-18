# LEDGIO AI — Architecture

> สถาปัตยกรรมและการทำงานของระบบ LEDGIO AI (BossBoard)

> **สถานะ:** Demo / Pre-production — ใช้งานได้จริง แต่ยังขาด Authentication และ Production Database | **ดู roadmap:** [ROADMAP.md](../ROADMAP.md)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages (8)  │  │  API Routes  │  │  Lib Layer   │  │
│  │  React 19    │  │  (18 routes) │  │  (9 modules) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └─────────────────┼──────────────────┘          │
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │ agents-store │                     │
│                    │  (~900 LOC)  │                     │
│                    └──────┬───────┘                     │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │ ~/.bossboard/ │
                    │  JSON Files   │
                    └───────────────┘
```

LEDGIO AI เป็น **Next.js 16 full-stack application** ที่ทำงานแบบ standalone (ไม่ต้องพึ่ง database) โดยเก็บข้อมูลทั้งหมดเป็น JSON files ใน `~/.bossboard/`

---

## Pages (8)

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | ภาพรวมระบบ — สถิติ, quick actions, sessions ล่าสุด |
| `/research` | Meeting Room | ห้องประชุม AI — core feature ของระบบ |
| `/agents` | Agent Manager | สร้าง/แก้ไข/ลบ AI agents (4-step wizard) |
| `/teams` | Team Manager | จัดกลุ่ม agents เป็นทีม |
| `/tokens` | Token Analytics | สถิติใช้งาน tokens รายวัน/รายagent |
| `/settings` | Settings | ตั้งค่า Web Search API keys |
| `/guide` | User Guide | คู่มือใช้งาน 8 ขั้นตอน (ภาษาไทย) |
| `/benefits` | Benefits | แนะนำแพ็คเกจและราคา |

---

## Meeting Flow (5 Phases)

การประชุม AI เป็น core feature — ผู้ใช้ถามคำถาม, agents ถกเถียงกัน, ประธานสรุปมติ

```
User Question
     │
     ▼
┌─────────────────────┐
│ Phase 0: Clarify    │  ← ประธานถามคำถามเพิ่มเติม (optional)
│ Chairman asks back  │     User ตอบ → ส่งเข้า Phase 1
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 1: PARALLEL   │  ← ทุก agent วิเคราะห์พร้อมกัน (Promise.allSettled)
│ All agents analyze  │     แสดง thinking UI ทันที, ส่งผลตาม seniority + 120ms stagger
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Consensus Check     │  ← ประธานตรวจว่าเห็นพ้องหรือไม่
│ (optional skip)     │     ถ้าเห็นพ้อง → ข้าม Phase 2 ไป Phase 3 เลย
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 2: Discussion │  ← agents อ่านความเห็นกัน อภิปราย
│ Debate & challenge  │     เห็นด้วย/ไม่เห็นด้วย พร้อมเหตุผล
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 3: Synthesis  │  ← Chairman สรุปมติ + Action Items
│ Chairman concludes  │
└─────────────────────┘
```

### SSE Streaming Protocol

การประชุมใช้ Server-Sent Events (SSE) ผ่าน `POST /api/team-research/stream`

```
Client → POST /api/team-research/stream
         { question, agentIds, mode, sessionId, clarificationAnswers? }

Server → SSE stream (event: name + data: JSON):
  event: session          data: {sessionId}                    // Session ID
  event: chairman         data: {agentId, name, emoji, role}   // Chairman info
  event: status           data: {message}                      // Phase status
  event: clarification_needed  data: {questions}               // Phase 0
  event: agent_start      data: {agentId, name, emoji, role}   // Agent begins
  event: agent_searching  data: {agentId, query}               // Web search
  event: web_sources      data: {agentId, sources}             // Search results
  event: message          data: {id, agentId, role, content}   // Agent response
                           role: thinking | finding | chat | synthesis
  event: agent_tokens     data: {agentId, input, output}       // Token usage
  event: final_answer     data: {content}                      // Final synthesis
  event: chart_data       data: {type, labels, datasets}       // Chart data
  event: follow_up_suggestions  data: {suggestions}            // Suggested Qs
  event: done             data: {sessionId}                    // End
```

---

## Agent System

### Agent Configuration

แต่ละ agent มีคุณสมบัติ:

| Field | Description |
|-------|-------------|
| `id` | UUID v4 |
| `name` | ชื่อแสดงผล |
| `emoji` | ไอคอน agent |
| `provider` | anthropic / openai / gemini / ollama / openrouter / custom |
| `model` | Model ID (เช่น `claude-4-sonnet-20250514`) |
| `apiKey` | Encrypted API key (AES-256-CBC) |
| `soul` | System prompt — บุคลิก, จุดยืน, วิธีถกเถียง |
| `seniority` | 1–99 ลำดับพูด (ต่ำสุด = ประธาน) |
| `skills` | Array of 19 skills (web_search, data_analysis, ...) |
| `mcpEndpoint` | Optional MCP Server URL |
| `webSearchEnabled` | เปิด/ปิด web search |
| `baseUrl` | Custom API endpoint (for custom provider) |
| `isActive` | เปิด/ปิด agent |

### 6 Agent Templates

| # | Template | Role |
|---|----------|------|
| 1 | นักบัญชีอาวุโส | Senior Accountant — มาตรฐานการบัญชี |
| 2 | ผู้สอบบัญชี CPA | CPA Auditor — ตรวจสอบและให้ความเห็น |
| 3 | ที่ปรึกษาภาษี | Tax Consultant — ภาษีเงินได้/VAT/ภาษีหัก ณ ที่จ่าย |
| 4 | นักวิเคราะห์งบการเงิน | Financial Analyst — วิเคราะห์อัตราส่วนทางการเงิน |
| 5 | ผู้ตรวจสอบภายใน | Internal Auditor — ความเสี่ยงและ internal control |
| 6 | Custom | สร้าง agent ตามต้องการ — กำหนด soul/skills เอง |

### Chairman Selection

Agent ที่มี **seniority ต่ำสุด** จะเป็นประธาน (Chairman) — รับผิดชอบ:
- Phase 0: ถามคำถามชี้แจง
- Phase 4: สรุปมติและ Action Items
- ตัดสินเมื่อ agents เห็นต่าง

---

## Context Stacking (12 Layers)

ทุกครั้งที่ agent ตอบ จะประกอบ context จาก 12 ชั้น:

```
 1. System Prompt (soul)           ← บุคลิก/จุดยืนของ agent
 2. Company Info                   ← ข้อมูลบริษัท (จาก settings)
 3. Accounting Standard            ← NPAEs / TFRS (จาก settings)
 4. Agent Skills                   ← ความสามารถ 19 อย่าง
 5. Meeting Role                   ← chairman / member / ลำดับที่
 6. Anti-Hallucination Rules       ← ต้องอ้างอิงกฎหมาย/มาตรฐาน
 7. Client Memory                  ← ข้อเท็จจริงข้ามsession
 8. Knowledge Base (per agent)     ← ไฟล์เอกสารเฉพาะagent
 9. MCP Data                       ← ข้อมูลจาก MCP Server
10. Web Search Results             ← ผลค้นหาจากอินเทอร์เน็ต
11. File Attachment                ← ไฟล์แนบจากuser
12. Conversation History           ← ประวัติการประชุม (full/last3/summary/none)
```

---

## Data Layer

### agents-store.ts (~900 LOC)

Module หลักที่จัดการข้อมูลทั้งหมด — เป็น abstraction layer เดียวระหว่าง API routes กับ JSON files

```
API Routes ──────► agents-store.ts ──────► ~/.bossboard/*.json
  (18 routes)      (read/write/encrypt)    (7 files)
```

**Key Functions:**
- `getAgents()` / `saveAgents()` — CRUD agents + encrypt/decrypt API keys
- `getTeams()` / `saveTeams()` — CRUD teams
- `getSettings()` / `saveSettings()` — Web Search API keys
- `getResearchHistory()` / `saveSession()` — Session management (max 100)
- `getAgentStats()` / `updateAgentStats()` — Token usage tracking
- `getClientMemory()` / `saveClientMemory()` — Cross-session facts
- `encrypt()` / `decrypt()` — AES-256-CBC with auto-generated key

### File Schema

| File | Format | Max Size |
|------|--------|----------|
| `agents.json` | `Agent[]` | No limit |
| `teams.json` | `Team[]` | No limit |
| `settings.json` | `{ webSearch: {...}, companyInfo: {...} }` | No limit |
| `research-history.json` | `Session[]` | Last 100 sessions |
| `agent-stats.json` | `{ [agentId]: { totalSessions, totalTokens, dailyUsage[] } }` | Last 90 days |
| `client-memory.json` | `{ facts: MemoryFact[] }` | No limit |
| `.encryption-key` | Plain text (32 chars) | Auto-generated |

---

## LLM Provider Integration

### Supported Providers

| Provider | Auth | Base URL |
|----------|------|----------|
| Anthropic | `x-api-key` header | `https://api.anthropic.com` |
| OpenAI | `Bearer` token | `https://api.openai.com` |
| Gemini | API key in URL | `https://generativelanguage.googleapis.com` |
| Ollama | None (local) | `http://localhost:11434` |
| OpenRouter | `Bearer` token | `https://openrouter.ai/api` |
| Custom | `Bearer` token | User-defined |

### Request Flow

```
Agent Config
     │
     ├── provider + model + apiKey
     │
     ▼
buildRequestPayload()
     │
     ├── Normalize to OpenAI-compatible format
     ├── Add system prompt (12-layer context)
     ├── Add conversation history
     │
     ▼
fetch(baseUrl, { signal: AbortSignal })
     │
     ├── Stream response (SSE)
     ├── Parse chunks → emit to client
     ├── Track tokens (input/output)
     │
     ▼
Client receives real-time updates
```

### SSRF Protection

ก่อนเรียก API — ระบบตรวจสอบ base URL:
- Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Block localhost / 127.0.0.1
- Block cloud metadata endpoints (169.254.169.254)
- Allow only HTTPS (except localhost for Ollama)

---

## Web Search Pipeline

```
Agent has webSearchEnabled=true
     │
     ▼
Extract search keywords from user question
     │
     ▼
Call Serper API or SerpAPI
     │  (API key from settings, encrypted)
     ▼
Parse results → top N snippets
     │
     ▼
Inject into agent context (Layer 10)
     │
     ▼
Agent cites sources → displayed as clickable links
```

---

## Security Architecture

### Encryption

```
API Keys (plaintext)
     │
     ▼
AES-256-CBC encrypt
     │
     ├── Key: AGENT_ENCRYPT_KEY env var
     │   OR auto-generated → ~/.bossboard/.encryption-key
     ├── IV: random 16 bytes per encryption
     │
     ▼
Stored as "iv:encrypted" in JSON files
```

### Rate Limiting

```
POST /api/team-research/stream
     │
     ▼
Sliding window check (per IP)
     │
     ├── Window: 60 seconds
     ├── Max: 5 requests
     │
     ├── OK → proceed
     └── Exceeded → 429 Too Many Requests
```

### Security Headers (via middleware)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Token Tracking

ทุก LLM call จะ track tokens:

```
Agent Response
     │
     ├── input_tokens (prompt)
     ├── output_tokens (completion)
     ├── total_tokens
     │
     ▼
Save to agent-stats.json
     │
     ├── Per-agent breakdown
     ├── Daily aggregation (30 days)
     ├── Recent sessions list
     │
     ▼
Display in:
     ├── /tokens page (analytics dashboard)
     ├── Meeting status bar (real-time)
     └── Dashboard (overview stats)
```

---

## Performance Optimization

### Parallel Phase 1

Phase 1 ใช้ `Promise.allSettled()` ยิง LLM calls ทุก agent พร้อมกัน — ลดเวลาประชุมได้ ~15–30%

```
Sequential (ก่อน):  Agent1 ──► Agent2 ──► Agent3 ──► Agent4 ──► Agent5
                    [30s]     [30s]     [30s]     [30s]     [30s]  = 150s

Parallel (หลัง):    Agent1 ───────────────────────────────────►
                    Agent2 ───────────────────────────────────►
                    Agent3 ───────────────────────────────────►  = ~30–40s
                    Agent4 ───────────────────────────────────►
                    Agent5 ───────────────────────────────────►
```

**Implementation Details:**
- Step 1: ส่ง `agent_start` + `thinking` message สำหรับทุก agent ทันที (UI แสดงหลาย agent กำลังคิดพร้อมกัน)
- Step 2: `Promise.allSettled()` เรียก LLM + web search + MCP พร้อมกัน
- Step 3: ผลลัพธ์ emit ตาม seniority order + 120ms stagger delay (UX เป็นธรรมชาติ)
- Agent ที่ fail ไม่กระทบ agent อื่น (fault-tolerant)
- แต่ละ agent วิเคราะห์อิสระในขอบเขต role ของตัวเอง

### LLM Call Optimization

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `max_tokens` | 2048 | ลดจาก 4096 — เพียงพอสำหรับการวิเคราะห์ |
| `temperature` | 0.3 | ตอบตรงประเด็น ลดการ hallucinate |
| Word limit (Phase 1) | 600 คำ | ป้องกัน agent เขียนยาวเกิน |
| Word limit (Phase 2) | 400 คำ | อภิปรายกระชับ |
| Word limit (Phase 3) | 800 คำ | สรุปมติครบถ้วน |

### Rate Limit Retry

`callLLMWithRetry()` wrapper — retry อัตโนมัติ 1 ครั้งเมื่อเจอ HTTP 429 (rate limit) พร้อม 2s delay

### Agent Voice System

`getAgentVoice()` — inject สไตล์การพูดเฉพาะ role ลงใน system prompt:
- CPA: อ้างอิงกฎหมาย, ยกมาตรา
- Tax Consultant: ตั้งคำถามเชิงท้าทาย, ชี้ความเสี่ยง
- Accountant: พูดเป็นระบบ, อ้างอิงมาตรฐานบัญชี
- Financial Analyst: วิเคราะห์ตัวเลข, เทียบ ratio
- Internal Auditor: มองหา red flag, control weakness

---

## OpenClaw Legacy

BossBoard ถูก fork มาจาก [OpenClaw](https://github.com/xmanrui/OpenClaw-bot-review) — มี legacy code 2 จุด:

| File | Purpose | Status |
|------|---------|--------|
| `lib/openclaw-cli.ts` | Call OpenClaw Gateway API | **Optional** — ไม่จำเป็นต้องติดตั้ง OpenClaw |
| `lib/openclaw-paths.ts` | Resolve `OPENCLAW_HOME` paths | **Fallback** — ใช้ `~/.bossboard/` เป็นค่าเริ่มต้น |
| `/api/config` | Read OpenClaw config | **Legacy** — ไม่ใช้ใน core features |
| `/api/config/agent-model` | Update model via OpenClaw Gateway | **Legacy** — ไม่ใช้ใน core features |

> BossBoard ทำงานได้สมบูรณ์โดยไม่ต้องมี OpenClaw CLI ติดตั้ง — legacy routes จะ return error gracefully

---

## Docker Architecture

```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder    # Build stage
FROM node:22-alpine AS runner     # Runtime stage

# Security
USER node (uid 1000)              # Non-root
EXPOSE 3000

# Health
HEALTHCHECK --interval=30s CMD wget --spider http://127.0.0.1:3000/api/health

# Data persistence
VOLUME ~/.bossboard → /home/node/.bossboard
```

**Output:** Standalone Next.js build (~50MB) — ไม่ต้อง node_modules ตอน runtime

---

## Directory Structure

```
BossBoard/
├── app/
│   ├── layout.tsx              # Root layout (theme, i18n, sidebar)
│   ├── page.tsx                # Dashboard
│   ├── providers.tsx           # Theme + i18n providers
│   ├── sidebar.tsx             # Navigation sidebar (8 items)
│   ├── globals.css             # Tailwind CSS 4
│   ├── icon.tsx                # Favicon generator
│   ├── agents/page.tsx         # Agent manager (4-step wizard)
│   ├── research/page.tsx       # Meeting room (SSE streaming)
│   ├── teams/page.tsx          # Team manager
│   ├── tokens/page.tsx         # Token analytics
│   ├── settings/page.tsx       # Web search settings
│   ├── guide/page.tsx          # User guide (8 steps)
│   ├── benefits/page.tsx       # Pricing & benefits
│   ├── components/             # 10 shared UI components
│   └── api/                    # 18 API routes
│       ├── team-research/
│       │   ├── stream/route.ts # SSE streaming (~1400 LOC)
│       │   ├── route.ts        # List sessions
│       │   ├── [id]/route.ts   # Get session
│       │   └── upload/route.ts # File upload parser
│       ├── team-agents/
│       │   ├── route.ts        # CRUD agents
│       │   └── [id]/
│       │       ├── route.ts    # Update/delete agent
│       │       └── knowledge/route.ts  # Agent knowledge base
│       ├── teams/
│       │   ├── route.ts        # CRUD teams
│       │   └── [id]/route.ts   # Update/delete team
│       ├── team-settings/route.ts   # Web search keys
│       ├── team-websearch/route.ts  # Web search proxy
│       ├── team-models/route.ts     # Available models
│       ├── agent-stats/route.ts     # Usage statistics
│       ├── token-usage/route.ts     # Token tracking
│       ├── client-memory/route.ts   # Cross-session memory
│       ├── health/route.ts          # Healthcheck
│       └── config/                  # OpenClaw legacy (optional)
├── lib/
│   ├── agents-store.ts         # Central data layer (~900 LOC)
│   ├── config-cache.ts         # In-memory config cache
│   ├── i18n.tsx                # Thai/English translations (~500 LOC)
│   ├── json.ts                 # Safe JSON read/write helpers
│   ├── openclaw-cli.ts         # OpenClaw Gateway client (legacy)
│   ├── openclaw-paths.ts       # Data directory resolver
│   ├── platforms.ts            # LLM provider definitions
│   ├── rate-limit.ts           # Sliding window rate limiter
│   └── theme.tsx               # Theme provider (auto/dark/light)
├── public/assets/              # Static assets (logos, images)
├── scripts/deploy.sh           # Deployment script
├── Dockerfile                  # Multi-stage Docker build
├── INSTALL.md                  # Full installation guide
├── quick_start.md              # 5-minute quickstart
├── CHANGELOG.md                # Version history
└── README.md                   # Project documentation
```
