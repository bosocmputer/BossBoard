"use client";

export default function BenefitsPage() {
  const heroPoints = [
    "ทีมที่ปรึกษา AI 10+ คน ทำงาน 24/7 — ค่าใช้จ่ายไม่ถึง 1% ของที่ปรึกษาจริง",
    "วิเคราะห์งบ วางแผนภาษี ตรวจ compliance ได้ใน 2 นาที แทนที่จะรอ 2 สัปดาห์",
    "ข้อมูลเก็บในเครื่องของคุณ ไม่ส่งขึ้น cloud ไม่แชร์กับใคร",
  ];

  const benefits = [
    { icon: "🏢", title: "ห้องประชุม AI", desc: "ที่ปรึกษาเฉพาะทาง AI หลายตำแหน่ง ถกเถียงและสรุปมติให้เหมือนทีมจริง ประชุมกี่รอบก็ได้ ไม่มี OT" },
    { icon: "💰", title: "ประหยัด 95%", desc: "จ้างที่ปรึกษาจริง 1 คน = 30,000-100,000 บาท/เดือน — BossBoard ให้ทีม 10+ คน ในราคาหลักร้อย" },
    { icon: "⚡", title: "เร็วทันใจลูกค้า", desc: "ลูกค้าถามเรื่องภาษี รอ 5 นาทีได้คำตอบที่มีรายงานอ้างอิง — ตอบได้ก่อนคู่แข่ง" },
    { icon: "📊", title: "ดูต้นทุนได้ตลอด", desc: "Dashboard แสดง token usage, กราฟแนวโน้มค่าใช้จ่าย, ต้นทุนต่อ session ชัดเจน" },
    { icon: "🔒", title: "ข้อมูลปลอดภัย 100%", desc: "ข้อมูลลูกค้าเก็บในเซิร์ฟเวอร์ส่วนตัว เข้ารหัส AES-256 ไม่ส่งออกภายนอก" },
    { icon: "🎯", title: "ปรับแต่งตามลูกค้า", desc: "สร้างทีม AI ตาม scope งานลูกค้าแต่ละราย — ร้านค้า, โรงงาน, นิติบุคคลหมู่บ้าน — ทุกประเภท" },
    { icon: "📚", title: "ฐานความรู้เฉพาะทาง", desc: "แนบไฟล์ความรู้ให้แต่ละ Agent เช่น มาตรฐานบัญชี ระเบียบ สรรพากร เอกสารภายใน" },
    { icon: "📄", title: "รายงานพร้อมใช้", desc: "Export รายงานการประชุมได้ทันที ส่งต่อให้ลูกค้าหรือกรรมการได้เลย มี chart ด้วย" },
    { icon: "🔄", title: "หลายมุมมอง ไม่ลำเอียง", desc: "Agents ถกเถียงเหมือนทีมที่ปรึกษาจริง — ได้มุมมองรอบด้าน ลด blind spot" },
    { icon: "🌐", title: "เชื่อมต่ออินเทอร์เน็ต", desc: "เปิด Web Search ให้ Agent ค้นข้อมูลล่าสุด — ข่าว กฎหมายใหม่ อัตราแลกเปลี่ยน realtime" },
    { icon: "🇹🇭", title: "พูดไทยเข้าใจไทย", desc: "AI เข้าใจบริบทบัญชีไทย — PAEs, NPAEs, ภ.ง.ด., สรรพากร, สมาคมนักบัญชี" },
    { icon: "🔑", title: "ใช้ key ของคุณเอง", desc: "BYOK (Bring Your Own Key) — ใช้ OpenRouter เลือก model ได้ 40+ ตัว ควบคุมต้นทุนเอง" },
  ];

  const useCases = [
    { emoji: "📋", title: "วางแผนภาษี", desc: "ทีม AI วิเคราะห์โครงสร้างรายได้/รายจ่าย แนะนำการลดหย่อนที่ถูกต้องตามกฎหมาย" },
    { emoji: "📊", title: "วิเคราะห์งบการเงิน", desc: "อัพโหลด Excel ให้ AI อ่านงบ วิเคราะห์ ratio พร้อมสรุปสุขภาพธุรกิจ" },
    { emoji: "⚖️", title: "ตรวจ Compliance", desc: "ตรวจสอบว่าลูกค้าทำถูกต้องตามมาตรฐานบัญชีและกฎหมายสรรพากร" },
    { emoji: "💼", title: "ที่ปรึกษา M&A", desc: "วิเคราะห์ความเป็นไปได้ในการซื้อ-ขายกิจการ ประเมินมูลค่า ตรวจ due diligence" },
    { emoji: "📜", title: "ร่าง/ตรวจสัญญา", desc: "ทีมทนายและผู้ตรวจสอบ AI ตรวจสัญญา ชี้ความเสี่ยง และแนะนำแก้ไข" },
    { emoji: "🏗️", title: "ตั้งบริษัทใหม่", desc: "ช่วยลูกค้าวิเคราะห์โครงสร้างบริษัท สิทธิประโยชน์ BOI และเรื่องภาษี" },
  ];

  const plans = [
    {
      name: "Solo",
      badge: "🆓",
      price: "ฟรี",
      period: "",
      target: "ลองใช้ดูก่อน ไม่เสียเงิน",
      features: [
        "Agent ได้ 3 ตัว",
        "ประชุมได้ 10 sessions/เดือน",
        "1 ผู้ใช้",
        "Export รายงาน",
        "ใช้ API key ของตัวเอง",
      ],
      excluded: ["File upload", "ฐานความรู้ Agent"],
      cta: "เริ่มใช้ฟรี",
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Starter",
      badge: "⭐",
      price: "490",
      period: "บาท/เดือน",
      target: "นักบัญชีอิสระ / Freelance",
      features: [
        "Agent ได้ 5 ตัว",
        "ประชุมไม่จำกัด",
        "1 ผู้ใช้",
        "Upload ไฟล์ (Excel/PDF)",
        "ฐานความรู้ Agent",
        "ข้อมูลบริษัท",
        "Line support",
      ],
      excluded: [],
      cta: "เริ่มต้นเพียง ₿490",
      highlight: false,
      color: "var(--accent)",
    },
    {
      name: "Professional",
      badge: "💼",
      price: "990",
      period: "บาท/เดือน",
      target: "สำนักงานบัญชี 1-5 คน",
      features: [
        "Agent ไม่จำกัด",
        "ประชุมไม่จำกัด",
        "5 ผู้ใช้",
        "Upload ไฟล์ทุกประเภท",
        "ฐานความรู้ Agent ไม่จำกัด",
        "Stats + กราฟวิเคราะห์",
        "Template บัญชี 10+ ตัว",
        "Web Search",
        "Priority support",
      ],
      excluded: [],
      cta: "เลือก Professional",
      highlight: true,
      color: "var(--accent)",
    },
    {
      name: "Enterprise",
      badge: "🏢",
      price: "2,490",
      period: "บาท/เดือน",
      target: "สำนักงานใหญ่ / หลายสาขา",
      features: [
        "ทุกอย่างใน Professional",
        "ผู้ใช้ไม่จำกัด",
        "Custom AI Templates",
        "MCP Integration (เชื่อมระบบ ERP)",
        "Onboarding + ช่วย setup",
        "White-label (ใส่ logo สำนักงาน)",
        "SLA + Dedicated support",
      ],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: false,
      color: "var(--accent)",
    },
  ];

  const testimonials = [
    { quote: "ลดเวลาวิเคราะห์งบจาก 3 วันเหลือ 5 นาที ทีม AI ช่วยได้มากจริงๆ", role: "เจ้าของสำนักงานบัญชี", emoji: "👩‍💼" },
    { quote: "ลูกค้าโทรมาถามเรื่องภาษี ตอบได้ทันทีพร้อมเอกสารอ้างอิง ประทับใจมาก", role: "นักบัญชีอิสระ", emoji: "👨‍💻" },
    { quote: "ค่า AI ต่อเดือนถูกกว่าค่ากาแฟทีม — แต่ให้ insight ที่มีมูลค่ามหาศาล", role: "ผู้จัดการฝ่ายบัญชี", emoji: "👔" },
  ];

  const comparisonRows = [
    { item: "วิเคราะห์งบการเงิน", traditional: "3-5 วัน", bossboard: "2-5 นาที" },
    { item: "วางแผนภาษี", traditional: "1-2 สัปดาห์", bossboard: "10 นาที" },
    { item: "ต้นทุนที่ปรึกษา/เดือน", traditional: "30,000-100,000 ฿", bossboard: "490-2,490 ฿" },
    { item: "จำนวนผู้เชี่ยวชาญ", traditional: "1-2 คน", bossboard: "10+ AI agents" },
    { item: "ทำงานนอกเวลา", traditional: "ไม่ได้ (OT)", bossboard: "24/7 ไม่มีวันหยุด" },
    { item: "ความลำเอียง", traditional: "มี bias", bossboard: "หลายมุมมอง ถกเถียงกัน" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
            🇹🇭 สร้างจากความเข้าใจธุรกิจบัญชีไทย
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight" style={{ color: "var(--text)" }}>
            เปลี่ยนสำนักงานบัญชีของคุณ<br />
            ให้มีทีม<span style={{ color: "var(--accent)" }}>ที่ปรึกษา AI 10+ คน</span>
          </h1>
          <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            BossBoard — ห้องประชุม AI ที่ทำให้ทุกการตัดสินใจมีข้อมูลรอบด้าน<br className="hidden sm:block" />
            เริ่มต้นเพียง <strong style={{ color: "var(--accent)" }}>490 บาท/เดือน</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <a href="/research" className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105" style={{ background: "var(--accent)", color: "#000" }}>
              🏛️ เข้าห้องประชุมเลย
            </a>
            <a href="#pricing" className="px-8 py-3 rounded-xl font-bold text-sm border transition-all hover:scale-105" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              💰 ดูแพ็กเกจราคา
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {heroPoints.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-left p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                <span style={{ color: "var(--accent)" }}>✓</span>
                <span className="text-sm" style={{ color: "var(--text)" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>
          เปรียบเทียบให้เห็นชัด
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>ที่ปรึกษาแบบเดิม vs BossBoard AI</p>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--card)" }}>
                <th className="text-left p-3 font-semibold" style={{ color: "var(--text)" }}></th>
                <th className="text-center p-3 font-semibold" style={{ color: "var(--text-muted)" }}>แบบเดิม</th>
                <th className="text-center p-3 font-semibold" style={{ color: "var(--accent)" }}>BossBoard</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--bg)" : "var(--card)" }}>
                  <td className="p-3 font-medium" style={{ color: "var(--text)" }}>{row.item}</td>
                  <td className="p-3 text-center" style={{ color: "var(--text-muted)" }}>{row.traditional}</td>
                  <td className="p-3 text-center font-bold" style={{ color: "var(--accent)" }}>{row.bossboard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>
          ทำไมสำนักงานบัญชีต้องใช้ BossBoard?
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
          12 เหตุผลที่จะเปลี่ยนวิธีทำงานของคุณ
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl p-5 transition-transform hover:scale-[1.02]"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="text-2xl mb-2">{b.icon}</div>
              <h3 className="font-bold mb-1" style={{ color: "var(--text)" }}>{b.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>
          ตัวอย่างการใช้งานจริง
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
          เปิดประชุม พิมพ์วาระ ได้คำตอบจากทีมผู้เชี่ยวชาญทันที
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="flex gap-3 p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-2xl flex-shrink-0">{uc.emoji}</div>
              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>{uc.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--text)" }}>
          เสียงจากผู้ใช้งาน
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-3xl mb-3">{t.emoji}</div>
              <p className="text-sm italic mb-3 leading-relaxed" style={{ color: "var(--text)" }}>&ldquo;{t.quote}&rdquo;</p>
              <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>— {t.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>
          แพ็กเกจราคา
        </h2>
        <p className="text-sm text-center mb-2" style={{ color: "var(--text-muted)" }}>
          เริ่มต้นหลักร้อย — ถูกกว่าค่ากาแฟทีมต่อเดือน
        </p>
        <p className="text-xs text-center mb-8" style={{ color: "var(--text-muted)" }}>
          * ค่า LLM API (~0.50-2 บาท/session) คิดตามการใช้งานจริง ผ่าน OpenRouter
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl p-5 flex flex-col"
              style={{
                background: "var(--card)",
                border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
                boxShadow: plan.highlight ? "0 0 24px color-mix(in srgb, var(--accent) 20%, transparent)" : undefined,
              }}
            >
              {plan.highlight && (
                <div className="text-xs font-bold uppercase tracking-wider text-center mb-3 py-1 rounded-full" style={{ background: "var(--accent)", color: "#000" }}>
                  ⭐ แนะนำ
                </div>
              )}
              <div className="text-center mb-4">
                <span className="text-xl">{plan.badge}</span>
                <h3 className="text-lg font-bold mt-1" style={{ color: "var(--text)" }}>{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-black" style={{ color: plan.color }}>{plan.price}</span>
                  {plan.period && <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{plan.period}</span>}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{plan.target}</p>
              </div>

              <ul className="flex-1 space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text)" }}>
                    <span className="mt-0.5" style={{ color: "var(--accent)" }}>✓</span>
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                    <span className="mt-0.5">✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  background: plan.highlight ? "var(--accent)" : "var(--bg)",
                  color: plan.highlight ? "#000" : "var(--text)",
                  border: plan.highlight ? "none" : "1px solid var(--border)",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Self-hosted note */}
        <div className="mt-8 rounded-xl p-5 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>🖥️ ต้องการติดตั้งในเซิร์ฟเวอร์ของคุณเอง?</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Self-hosted license เริ่มต้น 15,000 บาท/ปี — ข้อมูลทั้งหมดอยู่ในมือคุณ ไม่ต้องพึ่งพา cloud
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-black mb-4" style={{ color: "var(--text)" }}>
          พร้อมเปลี่ยนวิธีทำงานแล้วหรือยัง?
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          เริ่มใช้ฟรีวันนี้ ไม่ต้องผูกบัตร ไม่มีข้อผูกมัด — แค่เปิดห้องประชุม AI แล้วลองถามสิ่งที่อยากรู้
        </p>
        <a href="/research" className="inline-block px-10 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105" style={{ background: "var(--accent)", color: "#000" }}>
          🏛️ เริ่มใช้งาน BossBoard ฟรี
        </a>
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          สอบถามเพิ่มเติม: Line @bossboard · info@bossboard.ai
        </p>
      </div>
    </div>
  );
}
