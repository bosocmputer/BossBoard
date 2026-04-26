"use client";

interface Props {
  icon: string;
  label: string;
  color: string;
  isLive?: boolean;
}

export default function PhaseSeparator({ icon, label, color, isLive }: Props) {
  return (
    <div className={`flex items-center gap-2 py-1 ${isLive ? "animate-phase-reveal" : ""}`}>
      <div className="flex-1 h-px opacity-30" style={{ background: color }} />
      <div
        className="text-[11px] px-2 py-0.5 rounded-full"
        style={{ color, opacity: 0.75 }}
      >
        {icon} {label}
      </div>
      <div className="flex-1 h-px opacity-30" style={{ background: color }} />
    </div>
  );
}
