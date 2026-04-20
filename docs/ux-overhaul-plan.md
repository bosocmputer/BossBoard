# BossBoard — UX/UI Overhaul Plan สำหรับพนักงานบัญชี (Package C — Complete)

> **Status:** รอ implement (วันพรุ่งนี้ 2026-04-21+)
> **Target user:** พนักงานบัญชี/สำนักงานบัญชีไทย (อายุ 25–50, คุ้น Excel/Express/Formula/MAC5, ไม่คุ้น AI/LLM)
> **Scope:** Complete polish — ทุกจุดที่วิเคราะห์ไว้

## Context

แอปตอนนี้ (v1.12.1) functional ครบ + design system สะอาด แต่ **ออกแบบสำหรับ tech-literate users** ไม่ใช่พนักงานบัญชี — มี gap สำคัญ 5 เรื่อง: ศัพท์ AI/technical, agent creation ซับซ้อน, research phase ไม่ชัดเจน + session หายเมื่อ refresh, token cost ไม่เป็นบาท, mobile ใช้ไม่สะดวก. เอกสารนี้คือ execution plan ครบถ้วน แบ่งเป็น 5 phase เรียงตาม dependency — เริ่มจาก shared components ก่อน เพราะหลายหน้าต้องใช้

---

## Phase 1 — Shared Components Library (Foundation)

**ทำไมก่อน:** ทุก phase ที่เหลือต้องใช้ components พวกนี้ — สร้างก่อนจะลด rework

### 1.1 สร้าง Shared Components ใหม่ใน `components/`

**[components/Tooltip.tsx](components/Tooltip.tsx)** (new)
- Hover + focus trigger (keyboard accessible)
- Works บน mobile (tap to show, tap outside to close)
- Positioning: auto (flip if overflow)
- Props: `content`, `children`, `placement?: 'top' | 'bottom' | 'left' | 'right'`
- ใช้แทน native `title` attribute ทุกจุดใน codebase

**[components/Input.tsx](components/Input.tsx)** (new)
- Props: `label`, `error?`, `hint?`, `required?`, `tooltip?`, `icon?`, `suffix?`, standard input props
- แทน inline style pattern ที่เขียนซ้ำใน 10+ หน้า
- Variants: `text`, `password` (with show/hide toggle), `number`, `search`

**[components/Select.tsx](components/Select.tsx)** (new)
- แทน native `<select>` — support search, keyboard nav
- Props: `label`, `options: {value, label, description?, tooltip?}`, `error?`, `hint?`
- Mobile: open full-screen sheet instead of dropdown

**[components/Table.tsx](components/Table.tsx)** (new)
- Props: `columns`, `data`, `sortable?`, `onRowClick?`, `emptyState?`
- Mobile: auto-convert to card list (stack columns vertically)
- Sticky header
- Used at `/tokens`, `/admin/users`, agent list

**[components/Tabs.tsx](components/Tabs.tsx)** (new)
- Horizontal tabs + keyboard (arrow left/right)
- Use for `/settings` sections (Company / API Keys / Web Search)

**[components/Alert.tsx](components/Alert.tsx)** (new)
- Persistent (vs Toast which auto-dismisses 4s)
- Variants: `info`, `warning`, `success`, `danger`
- Optional dismiss button

**[components/Breadcrumb.tsx](components/Breadcrumb.tsx)** (new)
- Auto-derive from pathname
- Use on `/research/[id]`, `/agents/[id]`, etc.

**[components/CostDisplay.tsx](components/CostDisplay.tsx)** (new)
- Reusable: แสดง token count + converted THB side-by-side
- Props: `tokens`, `model?` (สำหรับ lookup pricing), `showBoth?`
- Utility `lib/pricing.ts` จะ export `tokensToTHB(tokens, model)` helper

### 1.2 เพิ่ม `lib/pricing.ts` (new)

- รวม pricing ของทุก model (per 1M input/output tokens) ใน USD
- Function `tokensToTHB(tokens, model, rate?)` ใช้ USD→THB exchange rate (config ใน env หรือ hardcoded 36)
- Cache ใน memory

### 1.3 Accessibility Pass

- เพิ่ม `aria-current="page"` ใน [app/sidebar.tsx](app/sidebar.tsx) active nav item
- Focus trap ใน Modal/Drawer ([components/Modal.tsx](components/Modal.tsx), sidebar drawer)
- Skip-to-content link ใน [app/layout.tsx](app/layout.tsx)
- `aria-label` ใน hamburger, sidebar collapse button

---

## Phase 2 — Plain Thai + Glossary (Universal)

**ทำไมลำดับ 2:** ทุกหน้าใช้ — แก้ก่อน phase ถัดไปที่เจาะลึกลงไปใน feature

### 2.1 Audit + Expand [lib/i18n.ts](lib/i18n.ts)

- Rename keys: `agents` → `consultants` (ที่ปรึกษา AI), `sessions` → `meetings` (การประชุม), `tokens` → `usage` (การใช้งาน)
- เพิ่ม `glossary` namespace: `glossary.prompt`, `glossary.tokens`, `glossary.contextWindow`, `glossary.rag`, `glossary.mcp`, `glossary.streaming`, `glossary.ttft`, `glossary.temperature`, `glossary.tfrs`, `glossary.npaes`, `glossary.paes`, `glossary.tsqc`, `glossary.coso` — ทุก entry มี short definition + example ภาษาไทย
- Audit ทั้ง codebase หาข้อความ English hardcoded → ย้ายเข้า i18n

### 2.2 ใช้ `<Tooltip>` + glossary ทุกจุด

- **Dashboard:** "Agents" → "ที่ปรึกษา AI", "Sessions" → "การประชุม"
- **Agents page:** "Soul" → "บทบาท (System Prompt)" + tooltip อธิบาย, "TTFT" → tooltip "เวลาก่อนคำตอบแรก", "tok/s" → "ความเร็วคำตอบ"
- **Tokens page:** "Input Tokens" → "คำถามที่พิมพ์", "Output Tokens" → "คำตอบจาก AI"; "↑ ↓" → "พิมพ์ / ตอบ"
- **Research page:** phase labels + hover tooltip อธิบายแต่ละ phase
- **Settings:** "NPAEs"/"PAEs" tooltip อธิบายในแง่บัญชีไทย

### 2.3 สร้าง `<Glossary>` page/modal

- [app/glossary/page.tsx](app/glossary/page.tsx) (new) — ตาราง คำศัพท์ + คำอธิบาย + ตัวอย่างการใช้งาน
- Link จาก Guide page + sidebar footer

---

## Phase 3 — Core Flow Improvements

### 3.1 Agent Creation Wizard Mode

**File:** [app/agents/page.tsx](app/agents/page.tsx)

- เพิ่ม toggle "โหมดง่าย / โหมดผู้เชี่ยวชาญ" ตั้ง default = ง่าย
- **โหมดง่าย:** เลือก template → ชื่อ + emoji + toggle web search → save (3 fields เท่านั้น)
- **โหมดผู้เชี่ยวชาญ:** เห็นทุกอย่าง (Soul, Model, MCP, Trusted URLs, Seniority)
- Model selector replacement:
  - โหมดง่าย: 3 options — "ประหยัด (เร็ว, ราคาถูก)" / "แนะนำ (สมดุล)" / "คุณภาพสูง (สำหรับงานซับซ้อน)"
  - หลังบ้าน map: ประหยัด = gemini-2.5-flash-lite, แนะนำ = claude-haiku-4.5, คุณภาพสูง = claude-sonnet-4.6
  - โหมดผู้เชี่ยวชาญ: เห็น full model list + pricing
- "Soul" field ใน wizard mode: แสดง dropdown ของ template prompts (editable) แทน empty textarea
- Template descriptions: expand จาก "TFRS/TSQC" → ประโยคอธิบายเต็มภาษาไทย + tooltip link ไป glossary
- เพิ่ม success toast "บันทึกแล้ว" หลัง save
- Character counter บน knowledge base upload
- Warning "อาจเพิ่มค่าใช้จ่าย" เมื่อ toggle web search

### 3.2 Research Page — Phase Clarity + Auto-save

**File:** [app/research/page.tsx](app/research/page.tsx)

- **Visual progress bar** (3 steps): "กำลังเสนอความเห็น" → "กำลังแลกเปลี่ยน" → "กำลังสรุป" พร้อม ETA
- Step indicator component (new): [components/PhaseProgress.tsx](components/PhaseProgress.tsx) — ใช้ CSS animations
- **Auto-save enable** (revert in-session-only จาก v1.11):
  - Persist ไปที่ Postgres (ใช้ ResearchSession อยู่แล้ว)
  - Toast "บันทึกการประชุมแล้ว" หลัง synthesis เสร็จ
  - Setting toggle: "บันทึกประชุมอัตโนมัติ" default ON
- **Error recovery UI:** ถ้า agent timeout → inline banner "ที่ปรึกษาคนที่ X ล่าช้า" + [ลองใหม่] [ข้ามคนนี้] [หยุด]
- **History mode** rename + preset:
  - Rename "full/last3/summary/none" → "เต็ม / 3 ข้อความล่าสุด / สรุปย่อ / ไม่ใช้"
  - Default: "สรุปย่อ" + tooltip "ประหยัด token ~60%"
- **File upload limits:** แสดง "สูงสุด 10 MB" + character counter
- **Session list:** เพิ่ม search box + filter by date + filter by agent (for superadmin: filter by user)

### 3.3 Chat vs Research Disambiguation

**Files:** [app/chat/ChatPage.tsx](app/chat/ChatPage.tsx), [app/research/page.tsx](app/research/page.tsx)

- Dashboard: เพิ่ม card "ถามด่วน vs ประชุมทีม" — อธิบายว่าแต่ละโหมดใช้เมื่อไหร่
- Chat page: header tooltip "สนทนา 1-ต่อ-1 กับที่ปรึกษาคนเดียว (เร็วกว่า ประหยัด token)"
- Research page: header tooltip "ประชุมหลายที่ปรึกษา (วิเคราะห์ลึก ใช้เวลา 3–8 นาที)"

---

## Phase 4 — Token Cost in THB (Financial Transparency)

**File:** [app/tokens/page.tsx](app/tokens/page.tsx), [app/agents/page.tsx](app/agents/page.tsx)

### 4.1 Tokens Page Overhaul

- **Hero card ใหญ่ที่สุด:** "ค่าใช้จ่ายเดือนนี้ ≈ ฿XXX" + trend arrow vs เดือนก่อน
- **Budget quota (optional):** ถ้าตั้งไว้ใน settings → แถบ progress "ใช้ไป 80% / 1,000 ฿" + warning สีส้มเมื่อ >80%
- **Per-agent breakdown:** แสดง cost THB ข้างจำนวน tokens
- **Per-session list:** เพิ่ม column "ค่าใช้จ่าย" (฿X.XX)
- **Chart redesign mobile:** vertical stacked bars → horizontal bar list บนมือถือ (ใช้ media query)
- **Historical compare:** "เดือนนี้ vs เดือนก่อน" with % change

### 4.2 Agent Model Pricing Display

- Replace "$0.10/$0.40 per 1M" → "ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1 ล้านคำ"
- ใช้ `<CostDisplay>` component

### 4.3 Settings — เพิ่ม Budget Config

**File:** [app/settings/page.tsx](app/settings/page.tsx)

- เพิ่ม section "งบประมาณรายเดือน" (optional) → หาก user ตั้ง → ใช้ใน tokens page progress bar
- เพิ่ม field "USD → THB rate" (default 36, editable)

---

## Phase 5 — Mobile Polish + Onboarding

### 5.1 Mobile Responsive Fixes

- **Modals → bottom sheet บน mobile** ([components/Modal.tsx](components/Modal.tsx)): `@media (max-width: 768px) { border-radius: 16px 16px 0 0; margin-top: auto; max-height: 85vh; }` + sticky footer ให้ปุ่มหลักอยู่ล่างเสมอ
- **Teams modal** ([app/teams/page.tsx](app/teams/page.tsx)): ใช้ sticky footer ปุ่ม "เริ่มประชุม" ให้เห็นเสมอ
- **Tokens chart mobile:** ใช้ horizontal list + progress bar
- **Dashboard templates:** เพิ่ม font-size min 12px, tap target min 44px
- **Emoji picker:** redesign ใช้ grid + search ([components/EmojiPicker.tsx](components/EmojiPicker.tsx) new)
- **Bottom nav option (future):** พิจารณา 4-icon bottom nav บน mobile (Home / Research / Agents / More)

### 5.2 Login Polish

**File:** [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx)

- "แสดงรหัสผ่าน" toggle (eye icon)
- "ลืมรหัสผ่าน?" link (อาจไปหน้า contact admin ก่อน, full flow ทำทีหลัง)
- Error ให้บอก field specific: "ชื่อผู้ใช้ไม่พบ" vs "รหัสผ่านไม่ถูกต้อง"
- `© 2026` → `© {new Date().getFullYear()}`

### 5.3 Onboarding Interactive

**File:** [app/page.tsx](app/page.tsx) (Dashboard)

- หลัง login ครั้งแรก (detect via `user.lastLoginAt` = first login): แสดง interactive tour
- ใช้ library เบา (zero dep): custom tour overlay ที่ highlight element + arrow + tooltip
- 5 steps: "นี่คือที่ปรึกษา AI" → "ลองเปิดห้องประชุม" → "ลองถามคำถาม" → "ดูค่าใช้จ่ายที่นี่" → "จัดการทีมที่นี่"
- Skip button + "don't show again" checkbox

### 5.4 Guide Page Fix

**File:** [app/guide/page.tsx](app/guide/page.tsx)

- Default expanded: `"get-started"` (step 1) แทน `"api-key"`
- Step 3 link ไป `/agents` จริง
- FAQ สามารถ expand ได้พร้อมกันหลายข้อ (remove auto-collapse)

### 5.5 Admin Users Improvements

**File:** [app/admin/users/page.tsx](app/admin/users/page.tsx)

- Password reset → ย้ายไป modal (ไม่ใช่ inline)
- เพิ่ม column "เข้าสู่ระบบล่าสุด" (ใช้ `user.lastLoginAt` — ต้องเพิ่มใน schema ถ้ายังไม่มี)
- เพิ่ม password strength indicator (weak / medium / strong)
- Role dropdown → ใช้ Thai labels: "ผู้ใช้ทั่วไป" / "ผู้จัดการระบบ"
- Delete confirmation: เปลี่ยนข้อความ "sessions และ memory ของผู้ใช้จะยังคงอยู่" → "ข้อมูลการประชุมของผู้ใช้จะยังถูกเก็บไว้ แต่ผู้ใช้จะเข้าระบบไม่ได้อีก"

### 5.6 Benefits Page Cleanup

**File:** [app/benefits/page.tsx](app/benefits/page.tsx)

- Solo plan: แก้ "ฟรี" → "ทดลองฟรี 14 วัน" (ให้ consistent)
- Pricing: เพิ่ม "(รวม VAT 7%)" หรือ "(ยังไม่รวม VAT)"
- CTA buttons: differentiate design — "ทดลองใช้" (primary) vs "ติดต่อฝ่ายขาย" (secondary)

---

## Phase 6 — Final Audit + Testing

### 6.1 Accessibility Audit

- Lighthouse accessibility score ≥ 90 ทุกหน้า
- axe DevTools → fix critical + serious issues
- Keyboard-only test: tab ผ่านทั้ง app ได้โดยไม่ติด
- Screen reader (VoiceOver/TalkBack) test: sidebar, research flow, agent creation

### 6.2 Mobile Device Testing

- iPhone SE (375px) — smallest common
- iPhone 14 (390px)
- iPad (768px)
- Android Chrome (360px)
- Test ทุก critical flow: login → create agent → start research → view tokens

### 6.3 Performance

- Lighthouse performance ≥ 80 mobile
- LCP < 2.5s, CLS < 0.1
- Bundle size check หลังเพิ่ม components

---

## Critical Files (ภาพรวม)

**ไฟล์ใหม่:**
- `components/Tooltip.tsx`, `components/Input.tsx`, `components/Select.tsx`, `components/Table.tsx`, `components/Tabs.tsx`, `components/Alert.tsx`, `components/Breadcrumb.tsx`, `components/CostDisplay.tsx`, `components/EmojiPicker.tsx`, `components/PhaseProgress.tsx`
- `lib/pricing.ts`
- `app/glossary/page.tsx`

**ไฟล์แก้:**
- [app/agents/page.tsx](app/agents/page.tsx)
- [app/research/page.tsx](app/research/page.tsx)
- [app/tokens/page.tsx](app/tokens/page.tsx)
- [app/settings/page.tsx](app/settings/page.tsx)
- [app/admin/users/page.tsx](app/admin/users/page.tsx)
- [app/sidebar.tsx](app/sidebar.tsx)
- [app/page.tsx](app/page.tsx)
- [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx)
- [app/guide/page.tsx](app/guide/page.tsx)
- [app/benefits/page.tsx](app/benefits/page.tsx)
- [app/chat/ChatPage.tsx](app/chat/ChatPage.tsx)
- [app/teams/page.tsx](app/teams/page.tsx)
- [app/layout.tsx](app/layout.tsx)
- [app/globals.css](app/globals.css)
- [lib/i18n.ts](lib/i18n.ts)
- [prisma/schema.prisma](prisma/schema.prisma) — เพิ่ม `User.lastLoginAt` ถ้ายังไม่มี

---

## Implementation Order (แนะนำ)

1. **Day 1:** Phase 1 ทั้งหมด (shared components + a11y) — foundation
2. **Day 2:** Phase 2 ทั้งหมด (i18n audit + glossary + tooltips)
3. **Day 3:** Phase 3.1 (agent wizard) + Phase 3.3 (chat vs research)
4. **Day 4:** Phase 3.2 (research progress + auto-save + error recovery)
5. **Day 5:** Phase 4 ทั้งหมด (token THB)
6. **Day 6:** Phase 5.1 (mobile) + 5.2 (login) + 5.4 (guide) + 5.6 (benefits)
7. **Day 7:** Phase 5.3 (onboarding) + 5.5 (admin users) + Phase 6 (audit + test)

แต่ละ day: commit + push + rebuild + deploy + update CHANGELOG + update MEMORY

---

## Verification Checklist

- [ ] Non-technical user (จริง) สร้าง agent ใหม่จบใน 3 นาทีโดยไม่ต้องถาม
- [ ] iPhone SE: ทุก CTA กดได้, chart อ่านออก, modal ไม่ตัด
- [ ] `/tokens` บอกค่าใช้จ่ายเป็นบาทได้ทันที ≤3 วินาที
- [ ] Research kill agent mid-synthesis → UI recover ได้
- [ ] Hover ทุก AI jargon → เห็น Thai tooltip
- [ ] Refresh /research → session กลับมา (auto-save ทำงาน)
- [ ] Keyboard-only navigate ทั้ง app ได้ (tab/shift-tab/enter/esc)
- [ ] Lighthouse a11y ≥ 90, performance ≥ 80 mobile ทุกหน้า
- [ ] `curl /api/health` → `{"status":"ok","db":"ok","redis":"ok"}`
- [ ] CHANGELOG + MEMORY updated หลังแต่ละ phase

---

## Post-Implementation

- Copy plan นี้ไป repo `docs/ux-overhaul-plan.md` ก่อนเริ่ม (สำหรับ share ทีม)
- Tag release เป็น v1.13.0 หลัง Phase 2 เสร็จ (breaking i18n keys)
- Tag v1.14.0 หลัง Phase 3 (agent wizard)
- Tag v1.15.0 หลัง Phase 4 (cost in THB)
- Tag v1.16.0 หลัง Phase 5+6 (mobile + onboarding)
