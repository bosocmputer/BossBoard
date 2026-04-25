"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface Props {
  items: string[];
}

export default function ActionItemList({ items }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => {
        const done = checked.has(i);
        return (
          <li key={i}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-2.5 text-left transition-all hover:opacity-80"
            >
              <span
                className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
                style={{
                  borderColor: done ? "var(--green, #4ade80)" : "var(--accent)",
                  background: done ? "var(--green, #4ade80)" : "transparent",
                }}
              >
                {done && <Check size={10} color="#000" />}
              </span>
              <span
                className="text-xs leading-relaxed"
                style={{
                  color: done ? "var(--text-muted)" : "var(--text)",
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {item}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
