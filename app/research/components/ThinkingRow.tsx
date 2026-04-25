"use client";

interface ThinkingAgent {
  id: string;
  emoji: string;
  name: string;
}

interface Props {
  agents: ThinkingAgent[];
}

export default function ThinkingRow({ agents }: Props) {
  if (agents.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border animate-message-in"
      style={{ borderColor: "var(--accent-20)", background: "var(--accent-3)" }}
    >
      {agents.length > 1 ? (
        <>
          {agents.map((a, i) => (
            <span key={a.id} className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text)" }}>
              <span>{a.emoji}</span>
              <span className="font-medium">{a.name}</span>
              {i < agents.length - 1 && <span style={{ color: "var(--text-muted)" }}>,</span>}
            </span>
          ))}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>กำลังวิเคราะห์</span>
        </>
      ) : (
        <>
          <span className="text-lg">{agents[0].emoji}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{agents[0].name}</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>กำลังวิเคราะห์</span>
          </div>
        </>
      )}
      <span className="thinking-dots text-base font-bold" style={{ color: "var(--accent)" }}>
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>
  );
}
