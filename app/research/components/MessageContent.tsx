"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COLLAPSE_LINE_LIMIT = 8;

export default function MessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const stripped = content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim();
  const lines = stripped.split("\n");
  const isLong = lines.length > COLLAPSE_LINE_LIMIT;
  const displayText = !expanded && isLong ? lines.slice(0, COLLAPSE_LINE_LIMIT).join("\n") : stripped;

  return (
    <div>
      <div className="prose-container text-sm leading-relaxed relative break-anywhere" style={{ color: "var(--text)" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5" style={{ color: "var(--text)" }}>{children}</h3>,
            h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1" style={{ color: "var(--text)" }}>{children}</h4>,
            h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text)" }}>{children}</h5>,
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--accent)" }}>{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>{children}</a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse" style={{ borderColor: "var(--border)" }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: "var(--accent-10)" }}>{children}</thead>,
            th: ({ children }) => <th className="px-2 py-1.5 text-left border font-semibold text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</th>,
            td: ({ children }) => <td className="px-2 py-1.5 border text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</td>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 pl-3 my-2 italic" style={{ borderColor: "var(--accent)", color: "var(--text-muted)" }}>{children}</blockquote>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return <pre className="text-xs p-3 rounded-lg my-2 overflow-x-auto" style={{ background: "var(--bg)", color: "var(--text)" }}><code>{children}</code></pre>;
              }
              return <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{children}</code>;
            },
            hr: () => <hr className="my-3" style={{ borderColor: "var(--border)" }} />,
          }}
        >
          {displayText}
        </ReactMarkdown>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none" style={{ background: "linear-gradient(transparent, var(--surface))" }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-1 px-2 py-0.5 rounded transition-all hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          {expanded ? "▲ ย่อข้อความ" : `▼ อ่านเพิ่ม (${lines.length} บรรทัด)`}
        </button>
      )}
    </div>
  );
}
