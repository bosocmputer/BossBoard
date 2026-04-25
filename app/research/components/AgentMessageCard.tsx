"use client";

import MessageContent from "./MessageContent";

interface Props {
  emoji: string;
  name: string;
  role: string;
  roleLabel: string;
  roleColorClass: string;
  content: string;
  isChairman: boolean;
  isLive?: boolean;
}

export default function AgentMessageCard({
  emoji, name, role, roleLabel, roleColorClass,
  content, isChairman, isLive,
}: Props) {
  // Enhanced border colors per role
  const borderStyle: React.CSSProperties = (() => {
    if (role === "finding") return { borderColor: "rgb(59 130 246 / 0.5)", background: "rgb(59 130 246 / 0.05)" };
    if (role === "chat") return { borderColor: "rgb(249 115 22 / 0.5)", background: "rgb(249 115 22 / 0.05)" };
    if (role === "synthesis") return { borderColor: "rgb(168 85 247 / 0.5)", background: "rgb(168 85 247 / 0.08)" };
    if (role === "analysis") return { borderColor: "rgb(34 197 94 / 0.3)", background: "rgb(34 197 94 / 0.04)" };
    return {};
  })();

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 ${isLive ? "animate-message-in" : ""} ${roleColorClass}`}
      style={borderStyle}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-lg">{emoji}</span>
        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{name}</span>
        {isChairman && (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "#000" }}>
            👑 ประธาน
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          {roleLabel}
        </span>
      </div>
      <MessageContent content={content} />
    </div>
  );
}
