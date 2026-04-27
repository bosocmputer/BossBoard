import type { ConversationRound, Agent } from "../types";

interface PDFMeta {
  companyName?: string;
  userName?: string;
}

// Strip markdown syntax for clean PDF text
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, (m) => m)
    .replace(/^>\s+/gm, "  ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .trim();
}

// Format Thai Buddhist Era date
function formatThaiDate(d: Date): string {
  const buddhistYear = d.getFullYear() + 543;
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${d.getDate()} ${months[d.getMonth()]} ${buddhistYear}`;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} น.`;
}

export async function generateMeetingPDF(
  rounds: ConversationRound[],
  agents: Agent[],
  meta?: PDFMeta
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Load Sarabun fonts
  async function loadFont(path: string): Promise<string> {
    const res = await fetch(path);
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const [regularB64, boldB64] = await Promise.all([
    loadFont("/fonts/Sarabun-Regular.ttf"),
    loadFont("/fonts/Sarabun-Bold.ttf"),
  ]);

  doc.addFileToVFS("Sarabun-Regular.ttf", regularB64);
  doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  doc.addFileToVFS("Sarabun-Bold.ttf", boldB64);
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const isAllQA = rounds.every((r) => r.isQA);

  const PW = 210;        // page width mm
  const ML = 18;         // margin left
  const MR = 18;         // margin right
  const MT = 18;         // margin top
  const MB = 18;         // margin bottom
  const CW = PW - ML - MR; // content width
  const PH = 297;
  const FOOTER_Y = PH - MB;

  const ACCENT = "#0891b2";    // professional blue (readable on white)
  const DARK   = "#0f172a";
  const GRAY   = "#64748b";
  const LIGHT_BG = "#f0f9ff";
  const ACCENT_BORDER = "#0891b2";

  let y = MT;
  let pageNum = 1;
  const pageStarts: number[] = []; // y at each addPage for footer

  function setRegular(size: number, color = DARK) {
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
  }
  function setBold(size: number, color = DARK) {
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(size);
    doc.setTextColor(color);
  }

  // Wrap text and return new Y after writing
  function addText(
    text: string,
    x: number,
    startY: number,
    maxW: number,
    lineH: number,
    checkPage = true
  ): number {
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      if (checkPage && startY > FOOTER_Y - 15) {
        addFooter();
        doc.addPage();
        pageNum++;
        startY = MT;
        drawPageHeader();
      }
      doc.text(line, x, startY);
      startY += lineH;
    }
    return startY;
  }

  function drawLine(x1: number, y1: number, x2: number, color = "#e2e8f0", lw = 0.3) {
    doc.setDrawColor(color);
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y1);
  }

  function addFooter() {
    setRegular(8, GRAY);
    drawLine(ML, FOOTER_Y - 4, PW - MR);
    doc.text(`หน้า ${pageNum}`, PW / 2, FOOTER_Y, { align: "center" });
    doc.text("สร้างโดย LEDGIO AI", PW - MR, FOOTER_Y, { align: "right" });
  }

  function drawPageHeader() {
    // Only on continuation pages — draw small brand
    setBold(9, ACCENT);
    doc.text("LEDGIO AI", ML, MT - 4);
    setRegular(8, GRAY);
    doc.text(isAllQA ? "สรุปการถามตอบ" : "รายงานการประชุมที่ปรึกษา", ML + 22, MT - 4);
    drawLine(ML, MT - 1, PW - MR, "#e2e8f0", 0.2);
  }

  function ensureSpace(needed: number) {
    if (y + needed > FOOTER_Y - 10) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MT;
      drawPageHeader();
    }
  }

  // ── COVER HEADER ────────────────────────────────────────────
  const now = new Date();

  // Brand
  setBold(20, ACCENT);
  doc.text("LEDGIO AI", ML, y);
  y += 8;

  setBold(14, DARK);
  doc.text(isAllQA ? "สรุปการถามตอบ" : "รายงานการประชุมที่ปรึกษา", ML, y);
  y += 2;

  drawLine(ML, y + 2, PW - MR, ACCENT, 0.5);
  y += 7;

  setRegular(10, GRAY);
  doc.text(`วันที่: ${formatThaiDate(now)}`, ML, y);
  doc.text(`เวลา: ${formatTime(now)}`, ML + 80, y);
  y += 6;

  if (meta?.companyName) {
    doc.text(`สำนักงาน: ${meta.companyName}`, ML, y);
    y += 5;
  }
  if (meta?.userName) {
    doc.text(`ผู้บันทึก: ${meta.userName}`, ML, y);
    y += 5;
  }
  y += 4;

  // ── ATTENDEES ────────────────────────────────────────────────
  const attendeeIds = new Set<string>();
  rounds.forEach((r) => r.messages.forEach((m) => attendeeIds.add(m.agentId)));

  if (attendeeIds.size > 0) {
    ensureSpace(18);
    setBold(11, DARK);
    doc.text(isAllQA ? "ผู้ตอบ" : "ผู้เข้าร่วมประชุม", ML, y);
    y += 1;
    drawLine(ML, y + 1, PW - MR);
    y += 5;

    const attendeeList = Array.from(attendeeIds)
      .map((id) => agentMap[id])
      .filter(Boolean)
      .map((a) => `${a.name}`)
      .join("  ·  ");

    setRegular(10, GRAY);
    y = addText(attendeeList, ML, y, CW, 5.5);
    y += 4;
  }

  // ── ROUNDS ───────────────────────────────────────────────────
  rounds.forEach((round, roundIdx) => {
    ensureSpace(20);

    // Round separator
    drawLine(ML, y, PW - MR, ACCENT, 0.6);
    y += 6;

    // Round heading
    setBold(12, DARK);
    const roundLabel = round.isSynthesis
      ? "มติสรุปที่ประชุม"
      : isAllQA
      ? `คำถามที่ ${roundIdx + 1}`
      : `วาระที่ ${roundIdx + 1}`;
    doc.text(roundLabel, ML, y);
    y += 6;

    if (!round.isSynthesis) {
      // Question
      setRegular(10.5, DARK);
      y = addText(`"${round.question}"`, ML + 3, y, CW - 3, 5.5);
      y += 2;

      // Chairman
      if (round.chairmanId && agentMap[round.chairmanId]) {
        setRegular(9.5, GRAY);
        doc.text(`ประธานที่ประชุม: ${agentMap[round.chairmanId].name}`, ML + 3, y);
        y += 5;
      }

      // Clarification answers
      if (round.clarificationAnswers?.length) {
        ensureSpace(10);
        setBold(10, GRAY);
        doc.text("ข้อมูลเพิ่มเติม", ML + 3, y);
        y += 5;
        round.clarificationAnswers.forEach((qa) => {
          setRegular(9, GRAY);
          y = addText(`ถาม: ${qa.question}`, ML + 6, y, CW - 9, 5);
          y = addText(`ตอบ: ${qa.answer}`, ML + 6, y, CW - 9, 5);
          y += 2;
        });
      }
      y += 2;

      // Agent messages
      const findings = round.messages.filter((m) => m.role === "finding");
      const chats = round.messages.filter((m) => m.role === "chat");

      [...findings, ...chats].forEach((msg) => {
        const agent = agentMap[msg.agentId];
        const label = msg.role === "finding" ? "ความเห็น" : "อภิปราย";

        ensureSpace(14);
        setBold(10, ACCENT);
        doc.text(`${label} — ${agent?.name ?? msg.agentName}`, ML + 3, y);
        y += 5;

        setRegular(9.5, DARK);
        const cleaned = stripMarkdown(msg.content);
        y = addText(cleaned, ML + 6, y, CW - 9, 5);
        y += 3;
      });
    }

    // ── RESOLUTION BOX ────────────────────────────────────────
    if (round.finalAnswer) {
      const resText = stripMarkdown(
        round.finalAnswer.replace(/```(?:chart|json)[\s\S]*?```/g, "")
      );
      const resLines = doc.splitTextToSize(resText, CW - 14) as string[];

      // synthMeta extras
      const sm = round.synthMeta;
      const actionLines = sm?.actionItems?.length
        ? sm.actionItems.map((a, i) => `${i + 1}. ${a}`)
        : [];
      const riskLine = sm?.riskLevel ? `ระดับความเสี่ยง: ${sm.riskLevel}` : "";
      const legalLine = sm?.legalRefs?.length ? `อ้างอิง: ${sm.legalRefs.join(", ")}` : "";
      const deadlineLine = sm?.deadlines?.length ? `กำหนดการ: ${sm.deadlines.join(", ")}` : "";

      const extraLines = [...actionLines, riskLine, legalLine, deadlineLine].filter(Boolean);
      const boxLines = resLines.length + extraLines.length;
      const boxH = 10 + boxLines * 5.5 + (extraLines.length ? 8 : 0) + 6;

      ensureSpace(boxH + 6);

      // Draw box
      doc.setFillColor(LIGHT_BG);
      doc.setDrawColor(ACCENT_BORDER);
      doc.setLineWidth(0.5);
      doc.roundedRect(ML, y, CW, boxH, 2, 2, "FD");

      y += 5;

      setBold(11, DARK);
      doc.text(isAllQA ? "คำตอบ" : "มติที่ประชุม", ML + 5, y);
      y += 6;

      setRegular(10, DARK);
      y = addText(resText, ML + 5, y, CW - 14, 5.5, false);

      if (extraLines.length) {
        y += 4;
        drawLine(ML + 5, y, ML + CW - 5, "#bfdbfe", 0.3);
        y += 4;

        if (actionLines.length) {
          setBold(9.5, DARK);
          doc.text("รายการที่ต้องดำเนินการ", ML + 5, y);
          y += 5;
          setRegular(9.5, DARK);
          actionLines.forEach((line) => {
            y = addText(line, ML + 8, y, CW - 16, 5, false);
          });
          y += 2;
        }
        if (riskLine) {
          setRegular(9.5, GRAY);
          doc.text(riskLine, ML + 5, y);
          y += 5;
        }
        if (legalLine) {
          setRegular(9.5, GRAY);
          y = addText(legalLine, ML + 5, y, CW - 10, 5, false);
          y += 2;
        }
        if (deadlineLine) {
          setRegular(9.5, GRAY);
          doc.text(deadlineLine, ML + 5, y);
          y += 5;
        }
      } else {
        y += 4;
      }

      y += 4;
    }

    // Web sources
    if (round.webSources?.length) {
      ensureSpace(12);
      setBold(10, GRAY);
      doc.text("แหล่งอ้างอิง", ML + 3, y);
      y += 5;
      setRegular(9, GRAY);
      round.webSources.forEach((src, si) => {
        y = addText(`${si + 1}. ${src.title} — ${src.domain}`, ML + 6, y, CW - 9, 5);
      });
      y += 3;
    }

    y += 4;
  });

  // Final footer on last page
  addFooter();

  // Generate filename
  const firstQ = rounds[0]?.question ?? "meeting";
  const shortTitle = firstQ.replace(/[^ก-๙a-zA-Z0-9\s]+/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
  const dateStr = now.toISOString().slice(0, 10);
  doc.save(`minutes-${shortTitle || "meeting"}-${dateStr}.pdf`);
}
