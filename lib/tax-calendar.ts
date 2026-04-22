/**
 * Thai Tax Calendar — upcoming deadlines injected into agent date context.
 * All dates are based on Revenue Department standard filing schedule (ปีภาษี 2568).
 */

export interface TaxDeadline {
  name: string;       // ชื่อแบบภาษี
  form: string;       // เลขแบบ เช่น ภ.พ.30
  description: string;
  daysUntil: number;  // วันที่เหลือ
  dueDateStr: string; // วันที่ครบกำหนด (th locale)
  urgency: "urgent" | "soon" | "upcoming"; // <7d | 7-14d | 15-30d
}

interface RecurringDeadline {
  form: string;
  name: string;
  description: string;
  /** Day of month deadline falls — for monthly filings. -1 = last day of month. */
  monthlyDay?: number;
  /** Fixed month + day deadlines (month is 1-indexed). Multiple entries for same form = different months. */
  fixed?: { month: number; day: number }[];
}

const RECURRING_DEADLINES: RecurringDeadline[] = [
  // Monthly filings
  {
    form: "ภ.พ.30",
    name: "ภาษีมูลค่าเพิ่ม (VAT)",
    description: "ยื่นภาษีมูลค่าเพิ่มประจำเดือน (ภ.พ.30) — ยื่นภายในวันที่ 15 ของเดือนถัดไป (e-Filing ขยายเป็นวันที่ 23)",
    monthlyDay: 15,
  },
  {
    form: "ภ.ง.ด.1",
    name: "ภาษีหัก ณ ที่จ่าย (เงินเดือน)",
    description: "ยื่นหัก ณ ที่จ่ายสำหรับพนักงานประจำเดือน — ยื่นภายในวันที่ 7 ของเดือนถัดไป",
    monthlyDay: 7,
  },
  {
    form: "ภ.ง.ด.3",
    name: "ภาษีหัก ณ ที่จ่าย (บุคคลธรรมดา)",
    description: "ยื่นหัก ณ ที่จ่ายสำหรับบุคคลธรรมดา — ยื่นภายในวันที่ 7 ของเดือนถัดไป",
    monthlyDay: 7,
  },
  {
    form: "ภ.ง.ด.53",
    name: "ภาษีหัก ณ ที่จ่าย (นิติบุคคล)",
    description: "ยื่นหัก ณ ที่จ่ายสำหรับนิติบุคคล — ยื่นภายในวันที่ 7 ของเดือนถัดไป",
    monthlyDay: 7,
  },
  // Annual / semi-annual filings
  {
    form: "ภ.ง.ด.50",
    name: "ภาษีเงินได้นิติบุคคล (ประจำปี)",
    description: "ยื่นแบบประจำปีภาษีเงินได้นิติบุคคล — ภายใน 150 วันหลังปิดรอบบัญชี (ปกติ 31 พ.ค.)",
    fixed: [{ month: 5, day: 31 }],
  },
  {
    form: "ภ.ง.ด.51",
    name: "ภาษีเงินได้นิติบุคคลครึ่งปี",
    description: "ยื่นประมาณการกำไรสุทธิครึ่งปีแรก — ภายใน 2 เดือนหลังครบครึ่งรอบบัญชี (ปกติ 31 ส.ค.)",
    fixed: [{ month: 8, day: 31 }],
  },
  {
    form: "ภ.ง.ด.90",
    name: "ภาษีเงินได้บุคคลธรรมดา (ประจำปี)",
    description: "ยื่นภาษีเงินได้บุคคลธรรมดาประจำปี — ภายใน 31 มีนาคม (e-Filing ขยายถึง 8 เมษายน)",
    fixed: [{ month: 3, day: 31 }],
  },
  {
    form: "ภ.ง.ด.91",
    name: "ภาษีเงินได้บุคคลธรรมดา (เงินเดือนอย่างเดียว)",
    description: "ยื่นภาษีเงินได้บุคคลธรรมดา (มีเฉพาะเงินเดือน ม.40(1)) — ภายใน 31 มีนาคม",
    fixed: [{ month: 3, day: 31 }],
  },
  {
    form: "ภ.ง.ด.94",
    name: "ภาษีเงินได้บุคคลธรรมดาครึ่งปี",
    description: "ยื่นภาษีเงินได้บุคคลธรรมดาครึ่งปี (ม.40(5)-(8)) — ภายใน 30 กันยายน",
    fixed: [{ month: 9, day: 30 }],
  },
  {
    form: "ภ.ธ.40",
    name: "ภาษีธุรกิจเฉพาะ (SBT)",
    description: "ยื่นภาษีธุรกิจเฉพาะประจำเดือน — ภายในวันที่ 15 ของเดือนถัดไป",
    monthlyDay: 15,
  },
  {
    form: "งบการเงิน (DBD)",
    name: "ยื่นงบการเงินต่อกรมพัฒนาธุรกิจการค้า",
    description: "บริษัทจำกัดต้องยื่นงบการเงินต่อ DBD ภายใน 1 เดือนหลังจากที่ประชุมผู้ถือหุ้นอนุมัติ (ปกติภายใน 31 พ.ค.)",
    fixed: [{ month: 5, day: 31 }],
  },
];

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatThaiDate(d: Date): string {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
}

function daysUntil(target: Date, from: Date): number {
  const diff = target.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Return upcoming Thai tax deadlines within the next `daysAhead` days. */
export function getUpcomingDeadlines(daysAhead = 45): TaxDeadline[] {
  const now = new Date();
  const results: TaxDeadline[] = [];

  for (const def of RECURRING_DEADLINES) {
    if (def.monthlyDay !== undefined) {
      // Check this month and next month
      for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
        const candidate = new Date(now.getFullYear(), now.getMonth() + monthOffset, def.monthlyDay);
        const diff = daysUntil(candidate, now);
        if (diff >= 0 && diff <= daysAhead) {
          results.push({
            form: def.form,
            name: def.name,
            description: def.description,
            daysUntil: diff,
            dueDateStr: formatThaiDate(candidate),
            urgency: diff < 7 ? "urgent" : diff < 15 ? "soon" : "upcoming",
          });
          break; // only one entry per filing per window
        }
      }
    } else if (def.fixed) {
      for (const { month, day } of def.fixed) {
        // Try current year, then next year
        for (const yearOffset of [0, 1]) {
          const candidate = new Date(now.getFullYear() + yearOffset, month - 1, day);
          const diff = daysUntil(candidate, now);
          if (diff >= 0 && diff <= daysAhead) {
            results.push({
              form: def.form,
              name: def.name,
              description: def.description,
              daysUntil: diff,
              dueDateStr: formatThaiDate(candidate),
              urgency: diff < 7 ? "urgent" : diff < 15 ? "soon" : "upcoming",
            });
            break;
          }
        }
      }
    }
  }

  // Sort by urgency (soonest first)
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Format deadlines as a context string for injection into agent system prompts. */
export function getTaxCalendarContext(daysAhead = 45): string {
  const deadlines = getUpcomingDeadlines(daysAhead);
  if (deadlines.length === 0) return "";

  const urgentEmoji = (u: TaxDeadline["urgency"]) =>
    u === "urgent" ? "🔴" : u === "soon" ? "🟡" : "🟢";

  const lines = deadlines.map(
    (d) =>
      `${urgentEmoji(d.urgency)} **${d.form}** (${d.name}) — ครบกำหนด: ${d.dueDateStr} (อีก ${d.daysUntil} วัน)`
  );

  return `\n\n📅 กำหนดการยื่นภาษีที่กำลังจะมาถึง (ภายใน ${daysAhead} วัน):\n${lines.join("\n")}\n— ถ้าคำถามเกี่ยวกับกำหนดเวลา ให้พิจารณากำหนดการข้างต้นด้วย\n`;
}
