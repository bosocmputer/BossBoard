/**
 * Thai Tax Calculator — server-side accurate tax computations.
 * Injects rate tables + formulas into agent system prompts so agents
 * use exact figures instead of hallucinating numbers.
 *
 * Tax year: 2568 (พ.ศ.) / 2025 (ค.ศ.)
 */

// ─── VAT ───────────────────────────────────────────────────────────────────

export interface VATResult {
  base: number;        // ฐานภาษี (ก่อน VAT)
  vatRate: number;     // อัตรา %
  vat: number;         // VAT amount
  total: number;       // ยอดรวม (รวม VAT)
  vatIncluded: boolean; // คำนวณจากยอดรวม (true) หรือยอดก่อน VAT (false)
}

/** คำนวณ VAT จากฐาน (ยอดก่อน VAT) */
export function calculateVATFromBase(base: number, ratePercent = 7): VATResult {
  const vat = Math.round(base * ratePercent) / 100;
  return { base, vatRate: ratePercent, vat, total: base + vat, vatIncluded: false };
}

/** แยก VAT ออกจากยอดรวม (VAT-inclusive) */
export function extractVATFromTotal(total: number, ratePercent = 7): VATResult {
  const base = Math.round((total * 100) / (100 + ratePercent) * 100) / 100;
  const vat = Math.round((total - base) * 100) / 100;
  return { base, vatRate: ratePercent, vat, total, vatIncluded: true };
}

// ─── WHT (Withholding Tax) ──────────────────────────────────────────────────

export type WHTType =
  | "service"           // ค่าบริการทั่วไป — 3%
  | "rent"              // ค่าเช่า — 5%
  | "transport"         // ค่าขนส่ง — 1%
  | "professional"      // ค่าวิชาชีพ (แพทย์/ทนาย/ออกแบบ) — 3%
  | "dividend"          // เงินปันผล (บุคคลธรรมดา) — 10%
  | "dividend_corporate"// เงินปันผล (นิติบุคคล ≤25% หุ้น) — 10%
  | "interest"          // ดอกเบี้ย — 1%
  | "prize"             // รางวัล/ส่วนลดจากการแข่งขัน — 5%
  | "advertising"       // ค่าโฆษณา — 2%
  | "construction"      // ค่าจ้างเหมาก่อสร้าง — 3%
  | "insurance"         // ค่านายหน้าประกัน — 1%
  | "other_juristic"    // อื่น ๆ (จ่ายให้นิติบุคคล) — 3%
  | "other_individual"; // อื่น ๆ (จ่ายให้บุคคลธรรมดา) — 3%

const WHT_RATES: Record<WHTType, number> = {
  service: 3,
  rent: 5,
  transport: 1,
  professional: 3,
  dividend: 10,
  dividend_corporate: 10,
  interest: 1,
  prize: 5,
  advertising: 2,
  construction: 3,
  insurance: 1,
  other_juristic: 3,
  other_individual: 3,
};

export const WHT_TYPE_LABELS: Record<WHTType, string> = {
  service: "ค่าบริการทั่วไป",
  rent: "ค่าเช่า",
  transport: "ค่าขนส่ง",
  professional: "ค่าวิชาชีพ (แพทย์/ทนาย/วิศวกร/นักบัญชี)",
  dividend: "เงินปันผล (จ่ายให้บุคคลธรรมดา)",
  dividend_corporate: "เงินปันผล (จ่ายให้นิติบุคคล)",
  interest: "ดอกเบี้ย",
  prize: "รางวัล/ส่วนลดจากการแข่งขัน",
  advertising: "ค่าโฆษณา",
  construction: "ค่าจ้างเหมาก่อสร้าง",
  insurance: "ค่านายหน้าประกัน",
  other_juristic: "อื่น ๆ (นิติบุคคล)",
  other_individual: "อื่น ๆ (บุคคลธรรมดา)",
};

export interface WHTResult {
  payment: number;
  type: WHTType;
  typeLabel: string;
  ratePercent: number;
  wht: number;
  netPayment: number;
}

export function calculateWHT(payment: number, type: WHTType): WHTResult {
  const rate = WHT_RATES[type];
  const wht = Math.round(payment * rate) / 100;
  return {
    payment,
    type,
    typeLabel: WHT_TYPE_LABELS[type],
    ratePercent: rate,
    wht,
    netPayment: payment - wht,
  };
}

// ─── CIT (Corporate Income Tax) ─────────────────────────────────────────────

export interface CITBracket {
  netProfit: number;
  taxRate: number;
  taxAmount: number;
  totalTax: number;
  effectiveRate: number;
  isSME: boolean;
}

/**
 * คำนวณภาษีเงินได้นิติบุคคล (CIT) — ปีภาษี 2568
 *
 * อัตราสำหรับ SME (ทุนชำระแล้ว ≤ 5 ล้านบาท AND รายได้ ≤ 30 ล้านบาท):
 *   0 – 300,000: 0%
 *   300,001 – 3,000,000: 15%
 *   > 3,000,000: 20%
 *
 * อัตราทั่วไป (non-SME): 20% ทุกบาท
 */
export function calculateCIT(netProfit: number, isSME: boolean): CITBracket {
  if (netProfit <= 0) {
    return { netProfit, taxRate: 0, taxAmount: 0, totalTax: 0, effectiveRate: 0, isSME };
  }

  let totalTax = 0;

  if (isSME) {
    if (netProfit <= 300_000) {
      totalTax = 0;
    } else if (netProfit <= 3_000_000) {
      totalTax = (netProfit - 300_000) * 0.15;
    } else {
      totalTax = (3_000_000 - 300_000) * 0.15 + (netProfit - 3_000_000) * 0.20;
    }
  } else {
    totalTax = netProfit * 0.20;
  }

  totalTax = Math.round(totalTax * 100) / 100;
  const effectiveRate = Math.round((totalTax / netProfit) * 10000) / 100;
  const taxRate = isSME ? (netProfit <= 300_000 ? 0 : netProfit <= 3_000_000 ? 15 : 20) : 20;

  return { netProfit, taxRate, taxAmount: totalTax, totalTax, effectiveRate, isSME };
}

// ─── PIT (Personal Income Tax) ──────────────────────────────────────────────

export interface PITResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  effectiveRate: number;
  brackets: { range: string; rate: number; taxInBracket: number }[];
}

/**
 * คำนวณภาษีเงินได้บุคคลธรรมดา (PIT) — ปีภาษี 2568
 * อัตราก้าวหน้า:
 *   0 – 150,000: ยกเว้น (0%)
 *   150,001 – 300,000: 5%
 *   300,001 – 500,000: 10%
 *   500,001 – 750,000: 15%
 *   750,001 – 1,000,000: 20%
 *   1,000,001 – 2,000,000: 25%
 *   2,000,001 – 5,000,000: 30%
 *   > 5,000,000: 35%
 */
export function calculatePIT(grossIncome: number, totalDeductions: number): PITResult {
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  const BRACKETS: { limit: number; rate: number; label: string }[] = [
    { limit: 150_000, rate: 0, label: "0 – 150,000" },
    { limit: 300_000, rate: 5, label: "150,001 – 300,000" },
    { limit: 500_000, rate: 10, label: "300,001 – 500,000" },
    { limit: 750_000, rate: 15, label: "500,001 – 750,000" },
    { limit: 1_000_000, rate: 20, label: "750,001 – 1,000,000" },
    { limit: 2_000_000, rate: 25, label: "1,000,001 – 2,000,000" },
    { limit: 5_000_000, rate: 30, label: "2,000,001 – 5,000,000" },
    { limit: Infinity, rate: 35, label: "> 5,000,000" },
  ];

  let remaining = taxableIncome;
  let totalTax = 0;
  let prevLimit = 0;
  const brackets: PITResult["brackets"] = [];

  for (const b of BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.limit - prevLimit);
    const taxInBracket = (slice * b.rate) / 100;
    totalTax += taxInBracket;
    if (slice > 0 && b.rate > 0) {
      brackets.push({ range: b.label, rate: b.rate, taxInBracket: Math.round(taxInBracket * 100) / 100 });
    }
    remaining -= slice;
    prevLimit = b.limit;
  }

  totalTax = Math.round(totalTax * 100) / 100;
  const effectiveRate = taxableIncome > 0 ? Math.round((totalTax / taxableIncome) * 10000) / 100 : 0;

  return { grossIncome, totalDeductions, taxableIncome, totalTax, effectiveRate, brackets };
}

// ─── Context string for system prompt injection ─────────────────────────────

/**
 * Returns a compact Thai tax rates reference table to inject into agent prompts.
 * This prevents hallucinated tax rates and calculation errors.
 */
export function getTaxCalculatorContext(): string {
  return `

💰 ตารางอัตราภาษีอ้างอิง (ปี พ.ศ. 2568 — ห้ามใช้อัตราอื่น):

**VAT (ภาษีมูลค่าเพิ่ม):**
- อัตราปัจจุบัน: 7% (ลดจาก 10% โดย พรฎ. ต่ออายุ)
- สูตร: VAT = ฐานภาษี × 7/100 | แยก VAT จากยอดรวม = ยอดรวม × 7/107

**WHT (ภาษีหัก ณ ที่จ่าย):**
| ประเภทเงินได้ | อัตรา |
|---|---|
| ค่าบริการทั่วไป | 3% |
| ค่าเช่า | 5% |
| ค่าขนส่ง | 1% |
| ค่าวิชาชีพ (แพทย์/ทนาย/วิศวกร/นักบัญชี) | 3% |
| เงินปันผล | 10% |
| ดอกเบี้ย | 1% |
| ค่าโฆษณา | 2% |
| ค่าจ้างเหมาก่อสร้าง | 3% |

**CIT (ภาษีเงินได้นิติบุคคล):**
- SME (ทุน ≤ 5 ล้าน + รายได้ ≤ 30 ล้านบาท): กำไร 0-300K → 0%, 300K-3M → 15%, >3M → 20%
- บริษัททั่วไป: 20% ทุกบาท

**PIT (ภาษีเงินได้บุคคลธรรมดา) — อัตราก้าวหน้า:**
| เงินได้สุทธิ | อัตรา |
|---|---|
| 0 – 150,000 | ยกเว้น |
| 150,001 – 300,000 | 5% |
| 300,001 – 500,000 | 10% |
| 500,001 – 750,000 | 15% |
| 750,001 – 1,000,000 | 20% |
| 1,000,001 – 2,000,000 | 25% |
| 2,000,001 – 5,000,000 | 30% |
| > 5,000,000 | 35% |

⚠️ เมื่อคำนวณตัวเลขภาษี ให้แสดงสูตรและขั้นตอนการคำนวณชัดเจนพร้อมอ้างอิงอัตราข้างต้น
`;
}
