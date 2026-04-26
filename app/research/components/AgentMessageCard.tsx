"use client";

import MessageContent from "./MessageContent";

// Ocean Dark palette — cool tones only, professional accountant feel
const BUBBLE_COLORS = [
  { bg: "rgb(56 189 248 / 0.10)", border: "rgb(56 189 248 / 0.40)" },   // sky
  { bg: "rgb(99 102 241 / 0.10)", border: "rgb(99 102 241 / 0.40)" },   // indigo
  { bg: "rgb(20 184 166 / 0.10)", border: "rgb(20 184 166 / 0.40)" },   // teal
  { bg: "rgb(125 211 252 / 0.10)", border: "rgb(125 211 252 / 0.40)" }, // light cyan
  { bg: "rgb(94 234 212 / 0.10)", border: "rgb(94 234 212 / 0.40)" },   // mint
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
  const bubbleColor = isChairman || role === "synthesis"
    ? { bg: "var(--accent-8)", border: "var(--accent)" }
    : BUBBLE_COLORS[agentIndex % BUBBLE_COLORS.length];

  const nameColor = isChairman || role === "synthesis"
    ? "var(--accent)"
    : bubbleColor.border;

  return (
    <div className={`flex items-start gap-3 ${isLive ? "animate-message-in" : ""}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 border"
        style={{ background: bubbleColor.bg, borderColor: bubbleColor.border }}
      >
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + badges */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold" style={{ color: nameColor }}>{name}</span>
          {isChairman && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
              style={{ background: "var(--accent-8)", color: "var(--accent)", border: "1px solid var(--accent-30)" }}
            >
              👑 ประธาน
            </span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            {roleLabel}
          </span>
          {isLive && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
              style={{ background: bubbleColor.border }}
            />
          )}
        </div>

        {/* Bubble */}
        <div
          className="rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 border text-sm leading-relaxed"
          style={{ background: bubbleColor.bg, borderColor: bubbleColor.border, color: "var(--text)" }}
        >
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
}
