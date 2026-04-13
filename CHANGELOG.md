# Changelog

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
