"use client";

import MessageContent from "./MessageContent";

const BUBBLE_COLORS = [
  { bg: "rgb(59 130 246 / 0.12)", border: "rgb(59 130 246 / 0.45)" },
  { bg: "rgb(249 115 22 / 0.12)", border: "rgb(249 115 22 / 0.45)" },
  { bg: "rgb(168 85 247 / 0.12)", border: "rgb(168 85 247 / 0.45)" },
  { bg: "rgb(34 197 94 / 0.12)", border: "rgb(34 197 94 / 0.4)" },
  { bg: "rgb(236 72 153 / 0.12)", border: "rgb(236 72 153 / 0.45)" },
  { bg: "rgb(234 179 8 / 0.12)", border: "rgb(234 179 8 / 0.45)" },
  { bg: "rgb(20 184 166 / 0.12)", border: "rgb(20 184 166 / 0.45)" },
];

interface Props {
  emoji: string;
  name: string;
  role: string;
  roleLabel: string;
  roleColorClass: string;
  content: string;
  isChairman: boolean;
  isLive?: boolean;
  agentIndex?: number;
  totalAgents?: number;
}

export default function AgentMessageCard({
  emoji, name, role, roleLabel,
  content, isChairman, isLive,
  agentIndex = 0,
}: Props) {
  const color = isChairman
    ? { bg: "var(--accent-8)", border: "var(--accent)" }
    : BUBBLE_COLORS[agentIndex % BUBBLE_COLORS.length];

  // Phase 2 chat: alternate left/right. Phase 1 finding: all left. Chairman/synthesis: centered.
  const isCenter = isChairman || role === "synthesis";
  const isRight = !isCenter && role === "chat" && agentIndex % 2 === 1;

  return (
    <div className={`flex ${isCenter ? "justify-center" : isRight ? "justify-end" : "justify-start"} ${isLive ? "animate-message-in" : ""}`}>
      <div className={`${isCenter ? "w-full max-w-2xl" : "max-w-[88%] sm:max-w-[78%]"}`}>
        {/* Avatar + name row */}
        <div className={`flex items-center gap-1.5 mb-1 ${isRight ? "flex-row-reverse" : ""} ${isCenter ? "justify-center" : ""}`}>
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{name}</span>
          {isChairman && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: "var(--accent)", color: "#000" }}>
              👑 ประธาน
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            {roleLabel}
          </span>
        </div>

        {/* Bubble */}
        <div
          className="rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border text-sm"
          style={{
            background: typeof color === "object" && "bg" in color ? (color as { bg: string; border: string }).bg : color,
            borderColor: typeof color === "object" && "border" in color ? (color as { bg: string; border: string }).border : "var(--border)",
            borderTopLeftRadius: isRight ? "1rem" : "0.25rem",
            borderTopRightRadius: isRight ? "0.25rem" : "1rem",
          }}
        >
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
}
