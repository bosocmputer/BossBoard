"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import type { MidMeetingQuestion } from "../types";

interface Props {
  question: MidMeetingQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
}

export default function MidMeetingQuestionCard({ question: q, onAnswer, onSkip }: Props) {
  const [answer, setAnswer] = useState("");

  return (
    <div className="mx-1 animate-message-in">
      <div className="border-2 rounded-xl p-4" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base">{q.agentEmoji}</div>
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
              {q.agentName}
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--accent-30)", color: "var(--accent)" }}>
                <MessageSquare size={9} className="inline mr-0.5" />ขอข้อมูลเพิ่มเติม
              </span>
            </div>
            {q.context && (
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{q.context}</div>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="text-sm font-medium mb-3 px-1" style={{ color: "var(--text)" }}>
          &ldquo;{q.question}&rdquo;
        </div>

        {/* Answer input */}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answer.trim()) { e.preventDefault(); onAnswer(q.questionId, answer.trim()); } }}
          rows={2}
          placeholder="พิมพ์คำตอบ... (⌘+Enter เพื่อส่ง)"
          className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { if (answer.trim()) onAnswer(q.questionId, answer.trim()); }}
            disabled={!answer.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30 hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            ตอบและดำเนินการต่อ →
          </button>
          <button
            onClick={() => onSkip(q.questionId)}
            className="px-4 py-2 rounded-lg text-xs border transition-all hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ข้ามคำถามนี้
          </button>
        </div>
      </div>
    </div>
  );
}
