# BossBoard — ห้องประชุม AI

ห้องประชุม AI สำหรับสำนักงานบัญชี — สร้างทีม AI agents หลายตัว ถามคำถามเดียว แล้วดู agents ถกเถียง วิเคราะห์ และสรุปมติร่วมกัน แบบ real-time

> **Forked and extended from** [xmanrui/OpenClaw-bot-review](https://github.com/xmanrui/OpenClaw-bot-review)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Runtime | Node.js 22 |
| Data | JSON files (`~/.bossboard/`), no database |
| Encryption | AES-256-CBC (API keys & search keys) |
| Streaming | Server-Sent Events (SSE) |
| Doc Parsing | xlsx, pdf-parse, mammoth |

---

## Features

### 🏠 Dashboard (`/`)
หน้าภาพรวมระบบ — แสดงสถิติ agents, teams, sessions, tokens ใช้งาน, quick actions, การประชุมล่าสุด, เอเจนต์ยอดนิยม

### 👥 Team Agents (`/agents`)
สร้างและจัดการทีม AI agents — แต่ละตัวมี provider, model, API key, soul (บุคลิก), skills, MCP endpoint เป็นของตัวเอง

- **11 Agent Templates** ใน 2 หมวด (เน้นสำนักงานบัญชี):
  - **สำนักงานบัญชี (10):** นักบัญชีอาวุโส, ผู้สอบบัญชี CPA, ที่ปรึกษาภาษี, นักวิเคราะห์งบการเงิน, ที่ปรึกษาบัญชีนิติบุคคล, เจ้าหน้าที่บัญชี, ผู้ตรวจสอบภายใน, ที่ปรึกษาต้นทุน, ที่ปรึกษาบัญชีระหว่างประเทศ, ที่ปรึกษาระบบบัญชี
  - **Custom (1):** สร้าง agent ตามต้องการ
- **6 Providers:** Anthropic, OpenAI, Google Gemini, Ollama, OpenRouter, Custom (OpenAI-compatible)
- **19 Skills** per agent: web_search, code_execution, data_analysis, financial_modeling, legal_research, case_analysis, contract_review ฯลฯ
- **Soul (System Prompt)** — กำหนดบุคลิก จุดยืน และวิธีถกเถียงของ agent
- **MCP Endpoint** — เชื่อม MCP Server per agent เพื่อดึงข้อมูลจากระบบภายนอก (admin/sales/purchase/stock/general)
- **Seniority (1–99)** — ลำดับพูดในการประชุม + กำหนดประธาน
- API keys encrypted (AES-256-CBC)

### 🏛️ Meeting Room (`/research`)
ห้องประชุม AI — ประธานนำทีมถกเถียงและสรุปมติทุกวาระ

- **4-Phase Meeting Flow:**
  1. **คิด (thinking)** — agents วิเคราะห์โจทย์
  2. **นำเสนอ (finding)** — agents พูดตามลำดับ seniority จาก soul/role
  3. **อภิปราย (chat)** — agents อ่านความเห็นกัน แสดงจุดยืน เห็นด้วย/ไม่เห็นด้วย
  4. **มติประธาน (synthesis)** — Chairman สรุป + Action Items
- **Chairman Auto-Detection** จาก role/seniority
- **Real-time SSE Streaming** — ดูทุก agent ตอบ real-time
- **Data Sources:**
  - 📎 File Attachment (xlsx/xls/xlsm/pdf/docx/doc/csv/json/txt/md/log, max 10MB)
  - 🔌 MCP per Agent (ดึงข้อมูลจาก MCP Server อัตโนมัติ)
  - 🌐 Web Search (Serper/SerpAPI) per agent
- **History Modes:** Full, Last 3, Summary, None (ประหยัด token)
- **Token Tracking** per agent (input/output/total) + stats dashboard
- **Charts**: Auto-render Bar/Line/Pie จาก `chart` blocks ใน AI output
- **History**: ดูประวัติ sessions เก่า (เก็บ 100 sessions ล่าสุด)
- **Follow-up Suggestions** จาก AI
- **Export**: Meeting Minutes เป็น Markdown

### ⚖️ Mock Trial (`/mock-trial`)
ศาลจำลอง — จำลองคดีไทยด้วย AI วิเคราะห์จาก 4 มุมมอง

- **5 ประเภทคดี:** แพ่ง, อาญา, แรงงาน, ครอบครัว, ปกครอง
- เลือกฝั่ง: โจทก์ หรือ จำเลย
- Input: ชื่อคดี, เรื่องราว, พยานหลักฐาน, ข้อมูลฝ่ายตรงข้าม, กฎหมายที่เกี่ยวข้อง
- AI วิเคราะห์ 4 บทบาท: นักวิเคราะห์, อัยการ, ทนายจำเลย, ผู้พิพากษา
- ผลลัพธ์: **โอกาสชนะ (0–100%)**, จุดแข็ง, จุดอ่อน, คำแนะนำ
- อ้างอิงกฎหมายไทยจริง (มาตรา, พ.ร.บ., ฎีกา)

### 📋 Teams (`/teams`)
จัดกลุ่ม agents เป็น teams เพื่อเลือกใช้ใน Research — เปิด meeting room พร้อมทีมที่เลือกได้ทันที

### 💰 Benefits & Pricing (`/benefits`)
หน้าแนะนำฟีเจอร์และแพ็คเกจ

| Plan | ราคา | รายละเอียด |
|------|------|------------|
| Starter | ฟรี | 3 agents, 10 sessions/เดือน, 1 user |
| Professional | ฿1,990/เดือน | Unlimited agents/sessions, 5 users, file upload |
| Enterprise | ฿4,990/เดือน | Unlimited users, custom templates, MCP, white-label |

> ค่า LLM API แยกต่างหาก (~0.50–2 บาท/session)

### ⚙️ Settings (`/settings`)
ตั้งค่า Web Search API keys (Serper / SerpAPI) พร้อมทดสอบ

### 🌐 i18n & Theme
- **2 ภาษา:** ไทย / English
- **2 ธีม:** Dark / Light (CSS variables, `data-theme` attribute)
- เก็บค่าใน localStorage

### 🧩 Shared UI Components (`app/components/`)

| Component | Description |
|-----------|-------------|
| `Button` | primary / secondary / ghost / danger variants, sm / md / lg sizes |
| `Card` | hover effect, padding options, rounded-2xl |
| `Modal` | Escape key close, backdrop blur, max-width options |
| `Badge` | default / accent / success / warning / danger / info variants |
| `Toggle` | Switch with label, sm / lg sizes, `role="switch"` |
| `EmptyState` | Icon / emoji + title + description + optional action |
| `Toast` | `showToast(type, message)` auto-dismiss 4s, success / error / warning / info |
| `Skeleton` | Loading placeholders — `Skeleton`, `SkeletonCard`, `SkeletonList` |

### 🧭 Navigation (Sidebar)
- **Icons:** Lucide React (ไม่ใช้ pixel art แล้ว)
- **Desktop:** Collapsible sidebar (224px ↔ 64px)
- **Mobile:** Header + slide-out drawer
- **Groups:** Dashboard → AI Tools (Research, Mock Trial) → Management (Agents, Teams) → System (Settings)

---

## Supported Models

| Provider | Models |
|----------|--------|
| **Anthropic** | Claude 4.6 Opus, Claude 4.5 Sonnet, Claude 4 Sonnet, Claude 3.7 Sonnet, Claude 3 Haiku |
| **OpenAI** | GPT-5.4, GPT-5.4 Mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, o4 Mini, o3 |
| **Gemini** | Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash Lite, 2.0 Flash |
| **Ollama** | Llama 3.2, Mistral, Qwen 2.5 (local) |
| **OpenRouter** | 40+ models รวม DeepSeek V3.2/R1, Qwen3, Grok 4, Llama 4 + **5 free models** |
| **Custom** | OpenAI-compatible endpoint ใดก็ได้ |

---

## Getting Started

```bash
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Requirements

- Node.js 22+
- No database required — ทุกอย่างเก็บเป็น JSON files ใน `~/.bossboard/`

---

## Data Storage

| File | Contents |
|------|----------|
| `~/.bossboard/agents.json` | Agent configs (API keys encrypted) |
| `~/.bossboard/teams.json` | Team groupings |
| `~/.bossboard/settings.json` | Web Search API keys (encrypted) |
| `~/.bossboard/research-history.json` | Research session history (last 100) |
| `~/.bossboard/agent-stats.json` | Per-agent token usage & session stats (last 90 days) |

---

## Environment Variables

```env
# Custom encryption key for API keys (recommended for production)
AGENT_ENCRYPT_KEY=your-32-character-secret-key-here
```

---

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/team-agents` | GET, POST | List / Create agents |
| `/api/team-agents/[id]` | PATCH, DELETE | Update / Delete agent |
| `/api/team-models?provider=` | GET | Available models per provider |
| `/api/teams` | GET, POST | List / Create teams |
| `/api/teams/[id]` | PATCH, DELETE | Update / Delete team |
| `/api/team-research` | GET | List research sessions |
| `/api/team-research/[id]` | GET | Get specific session |
| `/api/team-research/stream` | POST | SSE streaming multi-agent research |
| `/api/team-research/upload` | POST | Parse uploaded files to text context |
| `/api/mock-trial` | POST | Mock trial simulation |
| `/api/team-settings` | GET, POST | Web search API keys |
| `/api/team-websearch` | POST | Perform web search |
| `/api/agent-stats` | GET | Agent usage statistics |

---

## Deploy to Server

### Production Server

| Item | Detail |
|------|--------|
| Host | `192.168.2.109` (Ubuntu 24.04 LTS) |
| Port | `3003` |
| Node | v22.22.1 |
| Mode | Next.js standalone (`nohup`) |
| URL | `http://192.168.2.109:3003` |

### First Time Setup

```bash
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
PORT=3003 node .next/standalone/server.js
```

### Deploy Update

```bash
cd ~/BossBoard
git pull origin main
npm install          # ← สำคัญ ถ้ามี dependency ใหม่
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
fuser -k 3003/tcp
cd .next/standalone && PORT=3003 nohup node server.js > /tmp/bossboard.log 2>&1 &
```

> `scripts/deploy.sh` มีอยู่แต่แนะนำให้ deploy manual ตามขั้นตอนด้านบน

### Docker (alternative)

```bash
docker build -t bossboard .
docker run -p 3003:3000 -v ~/.bossboard:/root/.bossboard bossboard
```

### Server Services Overview (192.168.2.109)

| Port | Service |
|------|---------|
| 3000 | OpenClaw Admin (Docker) |
| 3001 | Other Next.js app |
| 3002 | Centrix Web (Docker) |
| **3003** | **BossBoard** ← this project |
| 4000 | OpenClaw API |
| 5001 | Centrix API (Docker) |
| 5432, 5434 | PostgreSQL (Docker) |
| 6380 | Redis (Docker) |
| 18789 | OpenClaw Gateway |

---

## License

MIT
