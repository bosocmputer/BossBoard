import type { ConversationRound, Agent } from "./types";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Extract a one-line verdict from the synthesis finalAnswer for history previews
export function extractVerdict(finalAnswer: string | undefined | null): string {
  if (!finalAnswer) return "";
  const stripped = finalAnswer.replace(/[#*`>]/g, "").split("\n").map(l => l.trim()).filter(Boolean);
  const verdict = stripped.find(l => /^(✅|❌|⚠️|✔|✗)|(^|\s)(ควร|ต้อง|ไม่ต้อง|ไม่ควร|สามารถ|ไม่สามารถ)/.test(l));
  return (verdict ?? stripped[0] ?? "").slice(0, 90);
}

export function buildMinutesMarkdown(rounds: ConversationRound[], agents: Agent[]): string {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const isAllQA = rounds.every((r) => r.isQA);
  const lines: string[] = [
    isAllQA ? "# สรุปการถามตอบ" : "# รายงานการประชุม",
    `> วันที่: ${new Date().toLocaleString("th-TH")}`,
    "",
  ];

  const attendeeIds = new Set<string>();
  rounds.forEach((r) => r.messages.forEach((m) => attendeeIds.add(m.agentId)));
  if (attendeeIds.size > 0) {
    lines.push(isAllQA ? "## ผู้ตอบ" : "## ผู้เข้าร่วมประชุม", "");
    attendeeIds.forEach((id) => {
      const a = agentMap[id];
      if (a) lines.push(`- ${a.emoji} **${a.name}** (${a.role})`);
    });
    lines.push("");
  }

  rounds.forEach((round, i) => {
    lines.push(`---`, round.isQA ? `## คำถามที่ ${i + 1}: ${round.question}` : `## วาระที่ ${i + 1}: ${round.question}`, "");

    if (!round.isQA && round.chairmanId) {
      const ch = agentMap[round.chairmanId];
      if (ch) lines.push(`**ประธานที่ประชุม:** ${ch.emoji} ${ch.name}`, "");
    }

    if (round.clarificationAnswers && round.clarificationAnswers.length > 0) {
      lines.push("### ข้อมูลเพิ่มเติมจากผู้ถาม", "");
      round.clarificationAnswers.forEach((qa) => {
        lines.push(`- **ถาม:** ${qa.question}`, `  **ตอบ:** ${qa.answer}`, "");
      });
    }

    const findings = round.messages.filter((m) => m.role === "finding");
    if (findings.length > 0) {
      lines.push("### ความเห็นจากที่ประชุม", "");
      findings.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    const chats = round.messages.filter((m) => m.role === "chat");
    if (chats.length > 0) {
      lines.push("### อภิปราย", "");
      chats.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    if (round.finalAnswer) {
      lines.push(round.isQA ? "### คำตอบ" : "### มติที่ประชุม", round.finalAnswer.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim(), "");
    }

    if (round.webSources && round.webSources.length > 0) {
      lines.push("### แหล่งอ้างอิง", "");
      round.webSources.forEach((src, si) => {
        lines.push(`${si + 1}. [${src.title}](${src.url}) — ${src.domain}`);
      });
      lines.push("");
    }

    if (round.agentTokens && Object.keys(round.agentTokens).length > 0) {
      const totalTokens = Object.values(round.agentTokens).reduce((sum, t) => sum + t.totalTokens, 0);
      lines.push(`> Token ที่ใช้ในวาระนี้: ${totalTokens.toLocaleString()}`, "");
    }
  });

  return lines.join("\n");
}
