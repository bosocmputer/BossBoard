"use client";

export default function BenefitsPage() {
  const benefits = [
    { icon: "🏢", title: "ห้องประชุม AI", desc: "ที่ปรึกษาเชิงกลยุทธ์ทำงาน 24/7 ไม่ต้องจ้างหลายคน" },
    { icon: "💰", title: "ลดต้นทุน", desc: "ประชุมทีมผู้เชี่ยวชาญราคาเศษเสี้ยวของค่าที่ปรึกษาจริง" },
    { icon: "⚡", title: "เร็ว", desc: "วิเคราะห์งบ, วางแผนภาษี, ตรวจ compliance ได้ใน 2 นาที (แทน 2 สัปดาห์)" },
    { icon: "📊", title: "ควบคุมต้นทุนได้", desc: "Dashboard แสดง token usage, กราฟแนวโน้ม, ค่าใช้จ่ายต่อ session" },
    { icon: "🔒", title: "ข้อมูลปลอดภัย", desc: "ข้อมูลเก็บใน server ส่วนตัว ไม่แชร์กับบุคคลที่สาม" },
    { icon: "🎯", title: "ปรับแต่งได้", desc: "สร้างทีม AI ตาม scope งานของลูกค้าแต่ละราย" },
    { icon: "📄", title: "ได้รายงานพร้อมใช้", desc: "ผลลัพธ์เป็นรายงานการประชุม export ได้ทันที" },
    { icon: "🔄", title: "Multi-perspective", desc: "Agents ถกเถียงกัน ได้มุมมองรอบด้านเหมือนทีมจริง" },
  ];

  const plans = [
    {
      name: "Starter",
      badge: "🆓",
      price: "ฟรี",
      period: "",
      target: "ลองใช้แล้วติดใจ",
      features: [
        "Agent ได้สูงสุด 3 ตัว",
        "ประชุมได้ 10 sessions/เดือน",
        "รองรับ 1 user",
        "Community support",
      ],
      excluded: ["File upload (Excel/PDF)", "Stats + กราฟวิเคราะห์"],
      cta: "เริ่มใช้ฟรี",
      highlight: false,
    },
    {
      name: "Professional",
      badge: "💼",
      price: "1,990",
      period: "บาท/เดือน",
      target: "สำนักงานบัญชี 1-5 คน",
      features: [
        "Agent ไม่จำกัด",
        "ประชุมไม่จำกัด",
        "รองรับ 5 users",
        "File upload (Excel/PDF/DOCX)",
        "Stats + กราฟวิเคราะห์",
        "Email support",
        "Template บัญชีครบ 7 ตัว",
      ],
      excluded: [],
      cta: "เลือกแพ็กเกจนี้",
      highlight: true,
    },
    {
      name: "Enterprise",
      badge: "🏢",
      price: "4,990",
      period: "บาท/เดือน",
      target: "สำนักงานบัญชี 5+ คน / หลายลูกค้า",
      features: [
        "ทุกอย่างใน Professional",
        "รองรับ users ไม่จำกัด",
        "Custom AI templates ตาม scope งาน",
        "MCP Integration (เชื่อมต่อระบบภายนอก)",
        "Priority support + onboarding",
        "White-label (ใส่ logo สำนักงาน)",
      ],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
          🏛️ BossBoard — ห้องประชุม AI
        </h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          ที่ปรึกษาอัจฉริยะสำหรับสำนักงานบัญชี
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="rounded-xl p-5 transition-transform hover:scale-[1.02]"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="text-2xl mb-2">{b.icon}</div>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text)" }}>{b.title}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
          แพ็กเกจราคา
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          เลือกแพ็กเกจที่เหมาะกับขนาดสำนักงานของคุณ
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-xl p-6 flex flex-col"
            style={{
              background: "var(--card)",
              border: plan.highlight
                ? "2px solid var(--accent)"
                : "1px solid var(--border)",
              boxShadow: plan.highlight ? "0 0 20px color-mix(in srgb, var(--accent) 20%, transparent)" : undefined,
            }}
          >
            {plan.highlight && (
              <div
                className="text-xs font-bold uppercase tracking-wider text-center mb-3 py-1 rounded-full"
                style={{ background: "var(--accent)", color: "white" }}
              >
                แนะนำ
              </div>
            )}
            <div className="text-center mb-4">
              <span className="text-xl">{plan.badge}</span>
              <h3 className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{plan.price}</span>
                {plan.period && (
                  <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{plan.target}</p>
            </div>

            <ul className="flex-1 space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <span style={{ color: "var(--accent)" }}>✓</span>
                  {f}
                </li>
              ))}
              {plan.excluded.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  <span>✗</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              style={{
                background: plan.highlight ? "var(--accent)" : "var(--bg)",
                color: plan.highlight ? "white" : "var(--text)",
                border: plan.highlight ? "none" : "1px solid var(--border)",
              }}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Pricing Notes */}
      <div
        className="rounded-xl p-5 text-sm"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>หมายเหตุ:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>ราคายังไม่รวมค่า LLM API (~0.50-2 บาท/session ขึ้นกับ model ที่ใช้)</li>
          <li>Starter ใช้ API key ของผู้ใช้เอง (OpenRouter / OpenAI)</li>
          <li>Professional / Enterprise มี option ให้สำนักงานใช้ key รวม + dashboard ดูต้นทุน</li>
        </ul>
      </div>
    </div>
  );
}
