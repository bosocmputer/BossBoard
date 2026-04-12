"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div
        ref={panelRef}
        className={`relative w-full ${maxWidth} rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl max-h-[90vh] overflow-y-auto animate-in`}
      >
        {title && (
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors" style={{ color: "var(--text-muted)" }}>
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
