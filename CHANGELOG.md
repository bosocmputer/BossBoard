# Changelog

## 2026-04-17 — v1.9: System Agents & External Knowledge

### System Agents
- **System Agents (DBD / RD)** — ระบบสร้าง agents อัตโนมัติ 2 ตัว: กรมพัฒนาธุรกิจการค้า (DBD) และ กรมสรรพากร (RD) พร้อม soul, role, trusted URLs ที่กำหนดมาให้
- **Edit Restriction** — กดแก้ไข System Agent แสดงเฉพาะแท็บ "Model" + "API Key" เท่านั้น (ไม่สามารถแก้ชื่อ/ตำแหน่ง/บุคลิก/ข้อมูล/ขั้นสูง)
- **Cannot Delete** — System agents มี `isSystem: true` flag ป้องกันการลบ

### External Knowledge Repository
- **Knowledge ย้ายไป GitHub** — ไฟล์ความรู้ (DBD: จดทะเบียนธุรกิจ/ประเภทนิติบุคคล, RD: ภาพรวมภาษี/คู่มือ VAT) ย้ายจาก `data/system-knowledge/` ไปเก็บที่ repo [`system-knowledge-ledgio-ai`](https://github.com/bosocmputer/system-knowledge-ledgio-ai)
- **Sync from GitHub** — `syncSystemKnowledge()` ดึง `manifest.json` + ไฟล์ความรู้ผ่าน GitHub Raw URL แทนอ่านจาก local filesystem
- **Sync API** — `POST /api/team-agents/sync-knowledge` สำหรับ trigger sync ผ่าน API
- **ปุ่ม "🔄 อัพเดทข้อมูล"** — บนหน้า Agents กดเพื่อ sync ความรู้ล่าสุดจาก GitHub ได้ทันที

## 2026-04-14 — v1.8: Parallel Phase 1 & UX Enhancement

### Performance
- **Parallel Phase 1** — agents วิเคราะห์พร้อมกัน (`Promise.allSettled`) แทนทำทีละคน → ลดเวลาประชุม ~15–30%
- **LLM Retry with Backoff** — `callLLMWithRetry()` auto-retry 1 ครั้งเมื่อเจอ rate limit (429) พร้อม 2s delay
- **Optimized Token Usage** — `max_tokens: 2048` (ลดจาก 4096), `temperature: 0.3`, word limits per phase (600/400/800 คำ)

### UX Improvements
- **Phase Progress Stepper** — แถบสถานะแสดง Phase ปัจจุบัน พร้อม sub-count "นำเสนอ (3/5)" ระหว่าง Phase 1
- **Phase Separators** — เส้นแบ่ง Phase พร้อม label สี (📋 นำเสนอ / 💬 อภิปราย / 🏛️ สรุปมติ)
- **Thinking Animation** — card กำลังวิเคราะห์ พร้อม animated dots + staggered animation เมื่อหลาย agent คิดพร้อมกัน
- **Agent Voice System** — `getAgentVoice()` inject สไตล์การพูดเฉพาะ role (อ้างอิงกฎหมาย, ตั้งคำถามท้าทาย, วิเคราะห์ตัวเลข ฯลฯ)
- **Multi-Agent Thinking UI** — `activeAgentIds: Set<string>` แสดงหลาย agent กำลังคิดพร้อมกันบน sidebar
- **Speaking Pulse Animation** — sidebar agent card กระพริบเมื่อกำลังพูด
- **Message Slide-in Animation** — ข้อความใหม่เลื่อนเข้ามาอย่างเป็นธรรมชาติ

## 2026-04-14 — v1.7: Security & Reliability Hardening

- **Rate Limiting** — Sliding-window rate limiter (5 req/60s per IP) บน stream endpoint → ป้องกัน abuse, return 429
- **Request Body Size Limit** — จำกัด request body 100KB บน stream endpoint → return 413
- **Client Disconnect Handling** — ตรวจจับเมื่อ client ตัดการเชื่อมต่อ ส่ง AbortSignal ไปยัง callLLM ทุกจุด (~11 calls) เพื่อหยุดเรียก LLM ทันที ประหยัด tokens
- **Healthcheck Endpoint** — `GET /api/health` + Dockerfile `HEALTHCHECK` instruction (auto-restart on failure)
- **Error Message Sanitization** — ทุก API route ไม่ส่งรายละเอียด error ดิบไปยัง client แล้ว → log ฝั่ง server แทน (ป้องกัน information disclosure)
- **File Upload MIME Validation** — ตรวจ magic bytes (PDF `%PDF`, Excel/Word `PK`/`OLE2`) ก่อน parse → ป้องกันไฟล์ปลอมนามสกุล
- **`.env.example`** — เพิ่มไฟล์เอกสาร environment variables ทั้งหมด

## 2026-04-13 — v1.6: Security & Intelligence Upgrade (10 Features)

- **Encryption Key Auto-Generation** — ถ้าไม่ตั้ง `AGENT_ENCRYPT_KEY` ระบบจะสร้าง key อัตโนมัติ + เก็บลง `~/.bossboard/.encryption-key`
- **Input Validation & SSRF Protection** — ป้องกัน SSRF บน base URL ของ agents (block private IPs, localhost, metadata endpoints)
- **Security Headers** — เพิ่ม CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Docker Non-Root User** — container ทำงานภายใต้ user `node` (uid 1000) ไม่ใช่ root
- **Anthropic Prompt Caching** — ใช้ `cache_control: { type: "ephemeral" }` บน system message สำหรับ Anthropic models
- **Search Query Rewriting** — AI rewrite คำถามเป็น search query ที่ดีขึ้นก่อนค้นเว็บ
- **Consensus Skip** — ถ้า agents เห็นตรงกัน ข้ามขั้นตอน discussion ไปสรุปเลย
- **Auto-Summarize Old Rounds** — สรุป history เก่าอัตโนมัติเมื่อยาวเกิน 2000 ตัวอักษร
- **Cross-Session Memory** — จดจำ facts จากการประชุมก่อนหน้า นำมาใช้ในครั้งถัดไป (`/api/client-memory`)
- **Fact-Checking Before Synthesis** — ประธานตรวจสอบข้อเท็จจริงจาก web search ก่อนสรุปมติ

## 2025-04-13 — v1.5: Quality & Export Upgrade

- **Fix: Chairman opening** — ข้อความเปิดประชุมของประธานแสดงเป็นการ์ดเต็ม ไม่ถูกตัดทอนอีกต่อไป
- **Fix: Thinking message** — ข้อความระหว่างวิเคราะห์ไม่แสดงข้อมูลที่ยังไม่ได้ค้นหา
- **Web Search error logging** — บันทึก log เมื่อ Serper/SerpApi ล้มเหลว ตรวจสอบได้จาก `docker logs bossboard | grep WebSearch`
- **Export Minutes upgrade** — บันทึกการประชุมครบถ้วน: ผู้เข้าประชุม, คำถามชี้แจง, ข้อค้นพบ, อภิปราย, มติ, แหล่งข้อมูลเว็บ, สรุป tokens
- **Clarification answers persisted** — คำตอบจากขั้นตอนคำถามชี้แจงถูกบันทึกใน session history
- **Agents page cleanup** — ลบ banners แนะนำที่ไม่จำเป็น ให้ดูเป็นมืออาชีพ

## 2025-04-12 — v1.4: Clarification Bug Fix

- **Fix: Clarification flow** — แก้ปัญหาห้องประชุมค้างเมื่อ AI ถามคำถามกลับ (คำถามหายเมื่อ user ตอบ)

## 2025-04-12 — v1.3: 4 Major Upgrades

- **Pre-flight Clarification** — ก่อนเริ่มประชุม ประธานจะวิเคราะห์คำถามและขอข้อมูลเพิ่มเติมถ้าจำเป็น
- **Anti-Hallucination Rules** — agents ต้องอ้างอิงมาตรา/กฎหมาย และแยก "ข้อเท็จจริง" กับ "ความเห็น" ออกจากกัน
- **Web Source Display** — แสดง URL แหล่งข้อมูลที่ agent ค้นหาจากอินเทอร์เน็ต พร้อมลิงก์คลิกได้
- **Professional Markdown UI** — render ข้อความ agent ด้วย Markdown (หัวข้อ, ตาราง, bullet, bold, code block)

## 2025-04-11 — v1.2: Knowledge Upgrade (4-Phase)

- Domain Knowledge — ฝังความรู้ประมวลรัษฎากรไทยลงใน soul ของทุก agent
- Trusted URLs — agent อ้างอิง rd.go.th, dbd.go.th, bot.or.th อัตโนมัติ
- Enhanced Knowledge System — ระบบ knowledge base พร้อม upload เอกสาร
- Auto web search สำหรับคำถามด้านกฎหมาย

## 2025-04-10 — v1.1: Smart Mode & UX

- **Smart Mode** — QA mode (ตอบคนเดียว) vs Meeting mode (ถกเถียงเต็มรูปแบบ)
- **Skip-to-Summary** — ยุบขั้นตอนกลางและข้ามไปดูมติได้
- **Model Fallback** — ถ้า model หลักล้มเหลว ระบบสลับไป fallback อัตโนมัติ
- **B2B UX overhaul** — ลบศัพท์เทคนิค ทำให้ผู้ใช้ทั่วไปเข้าถึงได้

## 2025-04-08 — v1.0: Initial Release

- ห้องประชุม AI สำหรับสำนักงานบัญชี
- 4-phase meeting flow (thinking → finding → discussion → synthesis)
- Multi-agent SSE streaming
- File upload, MCP integration, Web Search
- Token tracking & cost estimation
- Dashboard, Teams, Benefits, Settings pages
- Thai/English, Dark/Light/Auto theme
- Docker + Standalone deployment
