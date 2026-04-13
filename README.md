# LEDGIO AI — ห้องประชุม AI

> **From Ledger to Intelligence** — AI Financial & Tax Advisor for Modern Business

LEDGIO AI คือศูนย์รวม AI ที่ทำงานร่วมกัน เพื่อวิเคราะห์และให้คำตอบด้านบัญชีและภาษี — สร้างทีม AI agents หลายตัว ถามคำถามเดียว แล้วดู agents ถกเถียง วิเคราะห์ และสรุปมติร่วมกัน แบบ real-time

> **Project repo:** BossBoard | **Brand name:** LEDGIO AI

> **Forked and extended from** [xmanrui/OpenClaw-bot-review](https://github.com/xmanrui/OpenClaw-bot-review)

---

## Tech Stack

| Layer       | Technology                                 |
| ----------- | ------------------------------------------ |
| Framework   | Next.js 16 (App Router, standalone output) |
| Language    | TypeScript                                 |
| Styling     | Tailwind CSS 4                             |
| Icons       | Lucide React                               |
| Runtime     | Node.js 22                                 |
| Data        | JSON files (`~/.bossboard/`), no database  |
| Encryption  | AES-256-CBC (API keys & search keys)       |
| Streaming   | Server-Sent Events (SSE)                   |
| Doc Parsing | xlsx, pdf-parse, mammoth                   |

---

## Features

### 🏠 Dashboard (`/`)

หน้าภาพรวมระบบ — แสดงสถิติ agents, teams, sessions, tokens ใช้งาน, quick actions, การประชุมล่าสุด, เอเจนต์ยอดนิยม

- **Hero CTA** — ปุ่ม "🏛️ เริ่มประชุม AI" โดดเด่นบนสุด พร้อมลิงก์ตรงไปห้องประชุม
- **Quick Meeting Templates** — เลือก template ประชุมสำเร็จรูป (วิเคราะห์งบ, วางแผนภาษี, ประเมินความเสี่ยง, วิเคราะห์ต้นทุน) → เปิดห้องประชุมพร้อม `?q=` prefill

### 👥 Team Agents (`/agents`)

สร้างและจัดการทีม AI agents — แต่ละตัวมี provider, model, API key, soul (บุคลิก), skills, MCP endpoint เป็นของตัวเอง

- **4-Step Wizard Form** — สร้าง/แก้ไข agent ผ่าน step form แบบ tab navigation (Template → Model → ข้อมูล → ขั้นสูง)
- **Emoji Picker** — เลือก emoji จาก grid 80 ตัวใน 4 หมวด (คน, ธุรกิจ, วิเคราะห์, กฎหมาย) — ไม่ต้องพิมพ์เอง
- **Agent Cards** — แสดง model badge, ลำดับอาวุโส 🏛️, web search 🔍, MCP 🔌 indicators
- **Toast Notifications** — แจ้งเตือนเมื่อ save/delete/toggle agent สำเร็จ
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

- **5-Phase Meeting Flow:**
  0. **ถามกลับ (clarification)** — ประธานถามคำถามเพิ่มเติมก่อนเริ่มประชุม เพื่อให้ได้ข้อมูลครบถ้วน
  1. **คิด (thinking)** — agents วิเคราะห์โจทย์
  2. **นำเสนอ (finding)** — agents พูดตามลำดับ seniority จาก soul/role
  3. **อภิปราย (chat)** — agents อ่านความเห็นกัน แสดงจุดยืน เห็นด้วย/ไม่เห็นด้วย
  4. **มติประธาน (synthesis)** — Chairman สรุป + Action Items
- **Pre-flight Clarification** — ก่อนเริ่มประชุม ประธานจะวิเคราะห์คำถามและขอข้อมูลเพิ่มเติม (ประเภทกิจการ, ทุนจดทะเบียน, ฯลฯ) เพื่อลดการสมมติข้อมูล
- **Anti-Hallucination Rules** — ทุก agent ต้องอ้างอิงมาตรา/กฎหมาย และแยกให้ชัดระหว่าง "ข้อเท็จจริง" กับ "ความเห็น"
- **Web Source Display** — แสดง URL แหล่งข้อมูลที่ agent ค้นหาจากอินเทอร์เน็ต พร้อมลิงก์คลิกได้
- **Professional Markdown Rendering** — render ข้อความ agent ด้วย Markdown (หัวข้อ, ตาราง, bullet, bold/italic, code block)
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
- **Meeting Timer** — นับเวลาประชุม (mm:ss) แสดงใน status bar
- **Token Cost Estimation** — แสดงจำนวน tokens + ค่าใช้จ่ายโดยประมาณ (~$X.XXX) ใน status bar
- **URL Param `?q=`** — เปิดห้องประชุมพร้อม prefill คำถามจาก dashboard template
- **Export Minutes** — บันทึกการประชุม Markdown พร้อมผู้เข้าประชุม, คำถามชี้แจง, ข้อค้นพบ, อภิปราย, มติ, แหล่งข้อมูลเว็บ, สรุป tokens

### 📋 Teams (`/teams`)

จัดกลุ่ม agents เป็น teams เพื่อเลือกใช้ใน Research — เปิด meeting room พร้อมทีมที่เลือกได้ทันที

### 💰 Benefits & Pricing (`/benefits`)

หน้าแนะนำฟีเจอร์และแพ็คเกจ

| Plan         | ราคา         | รายละเอียด                                          |
| ------------ | ------------ | --------------------------------------------------- |
| Solo         | ฟรี 14 วัน   | 3 agents, 10 sessions, 1 user                       |
| Starter      | ฿790/เดือน   | 5 agents, ประชุมไม่จำกัด, file upload, 1 user       |
| Professional | ฿1,990/เดือน | Unlimited agents/sessions, 5 users, web search      |
| Enterprise   | ฿4,990/เดือน | Unlimited users, custom templates, MCP, white-label |

**บริการเสริม:**
| บริการ | ราคา |
|---------|------|
| Setup & Agent Config | 3,000–5,000 บาท/ครั้ง |
| Custom Agent Template | 2,000 บาท/ตัว |
| Training Workshop (2 ชม.) | 3,000 บาท/ครั้ง |
| Self-hosted License | 29,000 บาท/ปี |

> ค่า LLM API แยกต่างหาก (~0.50–5 บาท/session) — ลูกค้าใช้ API key ของตัวเอง (BYOK)

### ⚙️ Settings (`/settings`)

ตั้งค่า Web Search API keys (Serper / SerpAPI) พร้อมทดสอบ

### 🌐 i18n & Theme

- **2 ภาษา:** ไทย / English
- **3 โหมด:** Auto (ตามระบบ/เวลา) / Dark / Light
- Auto ใช้ `prefers-color-scheme` + fallback ตามเวลา (06:00–18:00 = light)
- เก็บค่าใน localStorage

### 🧩 Shared UI Components (`app/components/`)

| Component           | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `Button`            | primary / secondary / ghost / danger variants, sm / md / lg sizes            |
| `Card`              | hover effect, padding options, rounded-2xl                                   |
| `Modal`             | Escape key close, backdrop blur, max-width options                           |
| `Badge`             | default / accent / success / warning / danger / info variants                |
| `Toggle`            | Switch with label, sm / lg sizes, `role="switch"`                            |
| `EmptyState`        | Icon / emoji + title + description + optional action                         |
| `Toast`             | `showToast(type, message)` auto-dismiss 4s, success / error / warning / info |
| `Skeleton`          | Loading placeholders — `Skeleton`, `SkeletonCard`, `SkeletonList`            |
| `KeyboardShortcuts` | `?` เปิด shortcuts, ⌘+1–5 สลับหน้า, ⌘+Shift+N ประชุมใหม่                     |
| `Onboarding`        | Welcome overlay 4 steps — แสดงครั้งแรกที่ user ใหม่เข้าใช้                   |

### 🧭 Navigation (Sidebar)

- **Icons:** Lucide React (ไม่ใช้ pixel art แล้ว)
- **Desktop:** Collapsible sidebar (224px ↔ 64px)
- **Mobile:** Header + slide-out drawer
- **Groups:** Dashboard → AI Tools (Research) → Management (Agents, Teams) → System (Settings)

---

## Supported Models

| Provider       | Models                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| **Anthropic**  | Claude 4.6 Opus, Claude 4.5 Sonnet, Claude 4 Sonnet, Claude 3.7 Sonnet, Claude 3 Haiku |
| **OpenAI**     | GPT-5.4, GPT-5.4 Mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, o4 Mini, o3        |
| **Gemini**     | Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash Lite, 2.0 Flash                                   |
| **Ollama**     | Llama 3.2, Mistral, Qwen 2.5 (local)                                                   |
| **OpenRouter** | 40+ models รวม DeepSeek V3.2/R1, Qwen3, Grok 4, Llama 4 + **5 free models**            |
| **Custom**     | OpenAI-compatible endpoint ใดก็ได้                                                     |

---

## Getting Started

```bash
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **📖 ติดตั้ง Production Server ตั้งแต่เริ่มต้น?** ดู [INSTALL.md](INSTALL.md) — คู่มือแบบ step-by-step สำหรับผู้ไม่มีความรู้ด้านเทคนิค
>
> **⚡ Quick Start?** ดู [quick_start.md](quick_start.md) — ติดตั้งเร็ว 5 นาที
>
> **📋 Changelog?** ดู [CHANGELOG.md](CHANGELOG.md) — ประวัติการอัปเดตทั้งหมด

---

## Requirements

- Node.js 22+
- No database required — ทุกอย่างเก็บเป็น JSON files ใน `~/.bossboard/`

---

## Data Storage

| File                                 | Contents                                             |
| ------------------------------------ | ---------------------------------------------------- |
| `~/.bossboard/agents.json`           | Agent configs (API keys encrypted)                   |
| `~/.bossboard/teams.json`            | Team groupings                                       |
| `~/.bossboard/settings.json`         | Web Search API keys (encrypted)                      |
| `~/.bossboard/research-history.json` | Research session history (last 100)                  |
| `~/.bossboard/agent-stats.json`      | Per-agent token usage & session stats (last 90 days) |

---

## Environment Variables

```env
# Custom encryption key for API keys (recommended for production)
AGENT_ENCRYPT_KEY=your-32-character-secret-key-here
```

---

## API Endpoints

| Route                        | Method        | Description                          |
| ---------------------------- | ------------- | ------------------------------------ |
| `/api/team-agents`           | GET, POST     | List / Create agents                 |
| `/api/team-agents/[id]`      | PATCH, DELETE | Update / Delete agent                |
| `/api/team-models?provider=` | GET           | Available models per provider        |
| `/api/teams`                 | GET, POST     | List / Create teams                  |
| `/api/teams/[id]`            | PATCH, DELETE | Update / Delete team                 |
| `/api/team-research`         | GET           | List research sessions               |
| `/api/team-research/[id]`    | GET           | Get specific session                 |
| `/api/team-research/stream`  | POST          | SSE streaming multi-agent research   |
| `/api/team-research/upload`  | POST          | Parse uploaded files to text context |
| `/api/team-settings`         | GET, POST     | Web search API keys                  |
| `/api/team-websearch`        | POST          | Perform web search                   |
| `/api/agent-stats`           | GET           | Agent usage statistics               |

---

## Deploy to Server

### Production Server

| Item      | Detail                              |
| --------- | ----------------------------------- |
| Host      | `192.168.2.109` (Ubuntu 24.04 LTS)  |
| Port      | `3003`                              |
| Runtime   | Docker container                    |
| Image     | `bossboard` (built from Dockerfile) |
| URL       | `http://192.168.2.109:3003`         |
| Data      | `/home/bosscatdog/.bossboard`       |

### Docker Deploy (recommended)

```bash
# First time
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
docker build -t bossboard .
docker run -d --name bossboard -p 3003:3000 \
  -v ~/.bossboard:/root/.bossboard \
  --restart unless-stopped bossboard
```

```bash
# Update
cd ~/BossBoard
git pull origin main
docker build -t bossboard .
docker rm -f bossboard
docker run -d --name bossboard -p 3003:3000 \
  -v ~/.bossboard:/root/.bossboard \
  --restart unless-stopped bossboard
```

```bash
# View logs
docker logs -f bossboard
docker logs bossboard | grep WebSearch   # ← ตรวจสอบ Web Search API
```

### Standalone (alternative)

```bash
npm install && npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && PORT=3003 nohup node server.js > /tmp/bossboard.log 2>&1 &
```

### Server Services Overview (192.168.2.109)

| Port       | Service                      |
| ---------- | ---------------------------- |
| 3000       | OpenClaw Admin (Docker)      |
| 3001       | Other Next.js app            |
| 3002       | Centrix Web (Docker)         |
| **3003**   | **BossBoard** ← this project |
| 4000       | OpenClaw API                 |
| 5001       | Centrix API (Docker)         |
| 5432, 5434 | PostgreSQL (Docker)          |
| 6380       | Redis (Docker)               |
| 18789      | OpenClaw Gateway             |

---

## License

MIT
