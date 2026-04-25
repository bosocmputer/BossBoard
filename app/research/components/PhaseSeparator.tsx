"use client";

interface Props {
  icon: string;
  label: string;
  color: string;
  isLive?: boolean;
}

export default function PhaseSeparator({ icon, label, color, isLive }: Props) {
  return (
    <div className={`flex items-center gap-3 py-2 ${isLive ? "animate-phase-reveal" : ""}`}>
      <div className="flex-1 h-px" style={{ background: color }} />
      <div
        className="text-xs px-3 py-1.5 rounded-full border font-bold"
        style={{ borderColor: color, color, background: "var(--surface)" }}
      >
        {icon} {label}
      </div>
      <div className="flex-1 h-px" style={{ background: color }} />
    </div>
  );
}
