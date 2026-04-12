"use client";

import { Users, DollarSign, Zap, BarChart3, Shield, Settings2, BookOpen, FileText, MessageSquare, Globe, Key } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function BenefitsPage() {
  const benefits: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Users, title: "ห้องประชุม AI", desc: "สร้างทีมที่ปรึกษาเฉพาะทางหลายตำแหน่ง ให้ถกเถียงและสรุปมติในแต่ละวาระประชุม" },
    { icon: DollarSign, title: "ควบคุมต้นทุนได้", desc: "ใช้ API key ของคุณเอง (BYOK) จ่ายตามใช้จริง ดูต้นทุนต่อ session ได้ตลอด" },
    { icon: Zap, title: "ตอบลูกค้าได้เร็วขึ้น", desc: "ส่งคำถามเข้าประชุม ได้รายงานพร้อมข้อมูลอ้างอิงในไม่กี่นาที" },
    { icon: BarChart3, title: "Dashboard ค่าใช้จ่าย", desc: "แสดง token usage, กราฟแนวโน้ม, ต้นทุนต่อ session แบบ realtime" },
    { icon: Shield, title: "ข้อมูลอยู่ในมือคุณ", desc: "ติดตั้งบนเซิร์ฟเวอร์ส่วนตัว ข้อมูลลูกค้าไม่ถูกส่งออกภายนอก" },
    { icon: Settings2, title: "ปรับแต่งตาม scope งาน", desc: "สร้างทีม Agent ตามประเภทลูกค้า — ร้านค้า, โรงงาน, นิติบุคคลหมู่บ้าน" },
    { icon: BookOpen, title: "ฐานความรู้เฉพาะทาง", desc: "แนบไฟล์ให้แต่ละ Agent เช่น มาตรฐานบัญชี ระเบียบสรรพากร เอกสารภายใน" },
    { icon: Globe, title: "ค้นข้อมูลออนไลน์", desc: "เปิด Web Search ให้ Agent ค้นข่าว กฎหมายใหม่ อัตราแลกเปลี่ยนล่าสุด" },
  ];

  const useCases = [
    { title: "วางแผนภาษี", desc: "วิเคราะห์โครงสร้างรายได้/รายจ่าย แนะนำการลดหย่อนตามกฎหมาย" },
    { title: "วิเคราะห์งบการเงิน", desc: "อัพโหลด Excel ให้ AI อ่านงบ วิเคราะห์ ratio สรุปสุขภาพธุรกิจ" },
    { title: "ตรวจ Compliance", desc: "ตรวจสอบความถูกต้องตามมาตรฐานบัญชีและกฎหมายสรรพากร" },
    { title: "ที่ปรึกษา M&A", desc: "ประเมินมูลค่า ตรวจ due diligence สำหรับการซื้อ-ขายกิจการ" },
    { title: "ร่าง/ตรวจสัญญา", desc: "ตรวจสัญญา ชี้ความเสี่ยง และแนะนำแก้ไข" },
    { title: "ตั้งบริษัทใหม่", desc: "วิเคราะห์โครงสร้างบริษัท สิทธิประโยชน์ BOI และเรื่องภาษี" },
  ];

  const plans = [
    {
      name: "Solo",
      price: "ฟรี",
      period: "",
      target: "ลองใช้ดูก่อน",
      features: ["Agent ได้ 3 ตัว", "ประชุมได้ 10 sessions/เดือน", "1 ผู้ใช้", "Export รายงาน", "ใช้ API key ของตัวเอง"],
      excluded: ["File upload", "ฐานความรู้ Agent"],
      cta: "เริ่มใช้ฟรี",
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Starter",
      price: "490",
      period: "บาท/เดือน",
      target: "นักบัญชีอิสระ / Freelance",
      features: ["Agent ได้ 5 ตัว", "ประชุมไม่จำกัด", "1 ผู้ใช้", "Upload ไฟล์ (Excel/PDF)", "ฐานความรู้ Agent", "ข้อมูลบริษัท", "Line support"],
      excluded: [],
      cta: "เริ่มต้น 490 บาท",
      highlight: false,
      color: "var(--accent)",
    },
    {
      name: "Professional",
      price: "990",
      period: "บาท/เดือน",
      target: "สำนักงานบัญชี 1-5 คน",
      features: ["Agent ไม่จำกัด", "ประชุมไม่จำกัด", "5 ผู้ใช้", "Upload ไฟล์ทุกประเภท", "ฐานความรู้ไม่จำกัด", "Stats + กราฟวิเคราะห์", "Template บัญชี 10+ ตัว", "Web Search", "Priority support"],
      excluded: [],
      cta: "เลือก Professional",
      highlight: true,
      color: "var(--accent)",
    },
    {
      name: "Enterprise",
      price: "2,490",
      period: "บาท/เดือน",
      target: "สำนักงานใหญ่ / หลายสาขา",
      features: ["ทุกอย่างใน Professional", "ผู้ใช้ไม่จำกัด", "Custom AI Templates", "MCP Integration (เชื่อมระบบ ERP)", "Onboarding + ช่วย setup", "White-label (ใส่ logo สำนักงาน)", "SLA + Dedicated support"],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: false,
      color: "var(--accent)",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-bold mb-3 leading-tight" style={{ color: "var(--text)" }}>
          ห้องประชุม AI สำหรับ<span style={{ color: "var(--accent)" }}>สำนักงานบัญชี</span>
        </h1>
        <p className="text-sm sm:text-base mb-8 max-w-2xl" style={{ color: "var(--text-muted)" }}>
          สร้างทีมที่ปรึกษา AI เฉพาะทาง ให้ถกเถียงและสรุปมติเหมือนประชุมจริง ตอบคำถามลูกค้าได้เร็วขึ้น ควบคุมต้นทุนได้
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/research" className="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
            เข้าห้องประชุม
          </a>
          <a href="#pricing" className="px-6 py-2.5 rounded-lg font-bold text-sm border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            ดูแพ็กเกจราคา
          </a>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>
          ความสามารถหลัก
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl p-4 flex gap-3"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <b.icon size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <div>
                <h3 className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>{b.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>
          ตัวอย่างการใช้งาน
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>{uc.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          แพ็กเกจราคา
        </h2>
        <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
          ค่า LLM API (~0.50-2 บาท/session) คิดตามการใช้งานจริง ผ่าน OpenRouter
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl p-5 flex flex-col"
              style={{
                background: "var(--card)",
                border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {plan.highlight && (
                <div className="text-xs font-bold text-center mb-3 py-1 rounded-full" style={{ background: "var(--accent)", color: "#000" }}>
                  แนะนำ
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                  {plan.period && <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{plan.period}</span>}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{plan.target}</p>
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
                className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer"
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

        <div className="mt-6 rounded-xl p-4 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>ต้องการติดตั้งบนเซิร์ฟเวอร์ของคุณเอง?</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Self-hosted license เริ่มต้น 15,000 บาท/ปี
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text)" }}>
          พร้อมลองใช้งานแล้วหรือยัง?
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          เริ่มใช้ฟรี ไม่ต้องผูกบัตร — เปิดห้องประชุม AI แล้วลองถามสิ่งที่อยากรู้
        </p>
        <a href="/research" className="inline-block px-8 py-2.5 rounded-lg font-bold text-sm transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
          เริ่มใช้งานฟรี
        </a>
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          สอบถามเพิ่มเติม: Line @ledgio · info@ledgio.ai
        </p>
      </div>
    </div>
  );
}
