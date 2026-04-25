"use client";

import { MessageSquare } from "lucide-react";
import type { ClarificationQuestion } from "../types";

interface Props {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export default function ClarificationCard({ questions, answers, onAnswerChange, onSubmit, onSkip }: Props) {
  return (
    <div className="mx-1 space-y-3">
      <div className="border-2 rounded-xl p-4 sm:p-5" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <MessageSquare size={16} color="#000" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--accent)" }}>⏸ ประธานต้องการข้อมูลก่อนเริ่ม</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>กรุณาตอบคำถามเหล่านี้เพื่อให้ได้คำตอบที่แม่นยำขึ้น</div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={q.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                {qi + 1}. {q.question}
              </div>
              {q.type === "choice" && q.options ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onAnswerChange(q.id, opt)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                        style={{
                          borderColor: answers[q.id] === opt ? "var(--accent)" : "var(--border)",
                          background: answers[q.id] === opt ? "var(--accent-15)" : "transparent",
                          color: answers[q.id] === opt ? "var(--accent)" : "var(--text)",
                          fontWeight: answers[q.id] === opt ? 600 : 400,
                        }}
                      >{opt}</button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="หรือพิมพ์คำตอบเอง..."
                    value={q.options.includes(answers[q.id] ?? "") ? "" : (answers[q.id] ?? "")}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border outline-none mt-1"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="พิมพ์คำตอบ..."
                  value={answers[q.id] ?? ""}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onSubmit}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ✓ ส่งคำตอบ → เริ่มประชุม
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-xs border transition-all hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ข้ามคำถาม →
          </button>
        </div>
      </div>
    </div>
  );
}
