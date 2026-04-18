# LEDGIO AI — Production Roadmap

> **สถานะปัจจุบัน:** Demo / Pre-production — ใช้งานได้จริงบน server แต่ยังไม่พร้อม production สำหรับลูกค้าหลายราย  
> **อัปเดตล่าสุด:** 2026-04-18

---

## สถานะ Bug ที่แก้แล้ว

| # | Bug | สถานะ |
| - | --- | ------ |
| 1 | Dockerfile healthcheck ใช้ `localhost` → Alpine resolve เป็น IPv6 `[::1]` ทำให้ container unhealthy | ✅ แก้แล้ว (→ `127.0.0.1`) |
| 2 | Token analytics แสดง 0 — ตรวจสอบแล้วพบว่า API ถูกต้อง, key mapping ใช้ `totalInputTokens`/`totalOutputTokens` ถูกต้อง | ✅ ยืนยันแล้ว |
| 3 | Docker build cache กิน disk 66 GB → disk เต็ม 85% | ✅ แก้แล้ว — `docker builder prune` เหลือ 27% |
| 4 | ไม่มี Nginx — port 3003 เปิด public ตรง, ไม่มี reverse proxy | ✅ ติดตั้ง Nginx แล้ว port 80 → 3003 |
| 5 | UFW ไม่ได้เปิด port 80 → เข้า `http://192.168.2.109/` ไม่ได้ | ✅ แก้แล้ว — `ufw allow 80/tcp` |

---

## Phase 1 — Authentication & Multi-user (สำคัญ ก่อน prod)

**เป้าหมาย:** ป้องกันไม่ให้ทุกคนที่รู้ IP:port เข้าใช้ระบบได้

### งานที่ต้องทำ

- [ ] เพิ่ม `middleware.ts` — block ทุก route ยกเว้น `/login` และ `/api/auth/*`
- [ ] สร้าง Login page (`/login`) — username + password form
- [ ] สร้าง `/api/auth/login` — ตรวจ credentials, set httpOnly cookie (JWT หรือ session token)
- [ ] สร้าง `/api/auth/logout` — clear cookie
- [ ] User config เก็บใน `~/.bossboard/users.json` (hash password ด้วย bcrypt)
- [ ] Multi-user isolation — แต่ละ user เห็นแค่ agents/teams ของตัวเอง (เพิ่ม `userId` field)

### Tech แนะนำ
- **Option A (ง่ายสุด):** NextAuth.js v5 + Credentials provider
- **Option B (ควบคุมได้เอง):** JWT + httpOnly cookie + middleware manual

---

## Phase 2 — Storage Migration (ก่อน scale)

**เป้าหมาย:** เปลี่ยนจาก JSON files → database เพื่อรองรับ concurrent users

### ปัญหาของ JSON files ปัจจุบัน
- Concurrent writes จาก multiple users อาจชนและ corrupt file
- ไม่มี transaction — write ล้มกลางคัน data เสีย
- ไม่มี query capability — ต้อง load ทั้งไฟล์ทุกครั้ง
- ไม่มี backup strategy

### งานที่ต้องทำ

- [ ] **Option A — SQLite** (แนะนำสำหรับ self-hosted): migrate ทุก JSON → SQLite ด้วย `better-sqlite3`
  - agents, teams, settings, research-history, agent-stats, client-memory
  - ง่ายกว่า Postgres, ยังไม่ต้องการ infra เพิ่ม
- [ ] **Option B — Postgres** (ถ้าต้องการ multi-server): ใช้ Postgres ที่มีอยู่บน server (port 5436)
- [ ] Data migration script: JSON → DB
- [ ] Docker volume mount ให้ครอบคลุม knowledge files (`~/.bossboard/knowledge/`)
- [ ] Backup cron job สำหรับ database

---

## Phase 3 — Production Hardening

**เป้าหมาย:** ระบบเสถียร ปลอดภัย monitor ได้

### งานที่ต้องทำ

- [ ] **Nginx reverse proxy** — SSL termination, rate limiting ระดับ network
  - Let's Encrypt certificate (certbot)
  - Config: `proxy_pass http://127.0.0.1:3003`
- [ ] **Rate limit ครอบทุก API** — ไม่แค่ `/stream`
  - GET endpoints: 60 req/min per IP
  - POST (non-stream): 20 req/min per IP
- [ ] **Structured logging** — แทน `console.log` ด้วย pino หรือ winston
  - request ID per request
  - error stack trace ไม่ส่งหา client
- [ ] **Uptime monitoring** — Uptime Kuma หรือ Better Uptime สำหรับ alert
- [ ] **Docker healthcheck start-period** เพิ่มเป็น 60s สำหรับ cold start
- [ ] **Environment variable validation** — fail fast ถ้า config ขาด

---

## Phase 4 — Business Features

**เป้าหมาย:** feature สำหรับลูกค้าจริง

### งานที่ต้องทำ

- [ ] **Plan enforcement** — จำกัดตาม pricing plan (Solo/Starter/Pro/Enterprise)
  - จำกัดจำนวน agents, sessions, users
  - แสดง upgrade prompt เมื่อถึง limit
- [ ] **Usage billing tracking** — บันทึก token usage ต่อ user ต่อเดือน
- [ ] **Admin dashboard** (`/admin`) — manage users, plans, API keys
- [ ] **Audit log** — บันทึกการกระทำสำคัญ (สร้าง/ลบ agent, export ประชุม ฯลฯ)
- [ ] **Email notifications** — แจ้งเตือนเมื่อ plan ใกล้ครบ limit
- [ ] **Export ประชุม PDF** — นอกจาก Markdown ที่มีอยู่แล้ว
- [ ] **Custom domain** per enterprise customer (white-label)

---

## Phase 5 — Scale & Reliability

**เป้าหมาย:** รองรับ traffic จริง

### งานที่ต้องทำ

- [ ] **Redis สำหรับ rate limit** — แทน in-memory store ที่ reset ตาม container restart
  - มี Redis อยู่บน server แล้ว (port 6381)
- [ ] **SSE connection management** — จำกัด concurrent streaming connections ต่อ user
- [ ] **Background job queue** — สำหรับ long-running meeting sessions (Bull/BullMQ)
- [ ] **CDN สำหรับ static assets** — ลด load บน server
- [ ] **Horizontal scaling** — Docker Swarm หรือ Kubernetes (ถ้าจำเป็น)
- [ ] **Database replication** — read replica สำหรับ analytics queries

---

## Cloud Deployment Spec

ดูรายละเอียด spec การเช่า cloud, ราคา, Nginx config, Docker Compose production ได้ที่ [docs/CLOUD_SPEC.md](docs/CLOUD_SPEC.md)

---

## Infrastructure ปัจจุบัน (อัปเดต 2026-04-18)

```
Server: 192.168.2.109 (Ubuntu 24.04, Docker)
Disk: 109 GB / ใช้ ~28 GB (27%) — หลัง prune build cache

Network (UFW):
├── port 22   SSH
├── port 80   Nginx → bossboard :3003  ✅ เปิดแล้ว
├── port 3003  bossboard (direct)
├── port 3000  openclaw-admin
├── port 3001  (reserved)
├── port 4000  (reserved)
└── port 5000  (reserved)

Nginx: /etc/nginx/sites-enabled/bossboard
├── port 80 → proxy_pass http://127.0.0.1:3003
└── /api/team-research/stream → SSE config (no buffering, timeout 600s)

Containers รันอยู่:
├── bossboard         :3003  ← LEDGIO AI (this app) ✅ healthy
├── ledgioai          :3004  ← App อื่น (src-app) ✅ healthy
├── ledgioai-db       :5436  ← Postgres 16 ✅
├── ledgioai-redis    :6381  ← Redis 7 ✅
├── openclaw-admin    :3000  ← Admin panel ✅
├── centrix-web       :3002  ← Centrix frontend ✅
├── centrix-api       :5001  ← Centrix backend ✅
├── centrix-postgres  :5434  ← Postgres 16 ✅
├── centrix-redis     :6380  ← Redis 7 ✅
└── openclaw-postgres :5432  ← Postgres 16 ✅
```

---

## Priority ลำดับงาน

| Priority | Phase | เวลาประมาณ |
|----------|-------|-----------|
| 🔴 ด่วนมาก | Phase 1: Authentication | 2–3 วัน |
| 🟠 สำคัญ | Phase 2: Storage → SQLite/Postgres | 3–5 วัน |
| 🟡 ก่อน prod | Phase 3: Nginx SSL + Monitoring | 1–2 วัน |
| 🟢 หลัง launch | Phase 4: Business Features | 2–4 สัปดาห์ |
| 🔵 อนาคต | Phase 5: Scale | ตามความต้องการ |
