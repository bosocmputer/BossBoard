"use client";

import { useState } from "react";
import { Building2, MessageSquare, AlertTriangle, FileText, Clock, Check, Copy, Pin } from "lucide-react";
import MessageContent from "./MessageContent";
import ActionItemList from "./ActionItemList";
import SimpleBarChart from "./SimpleBarChart";
import type { ConversationRound } from "../types";

interface Props {
  round: Pick<ConversationRound, "finalAnswer" | "isQA" | "chartData" | "synthMeta" | "webSources">;
  chairmanEmoji?: string;
  chairmanName?: string;
  isLive?: boolean;
  onPin?: () => void;
  isPinned?: boolean;
}

export default function MeetingResolution({
  round, chairmanEmoji, chairmanName,
  isLive, onPin, isPinned,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(round.finalAnswer ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const { synthMeta, webSources } = round;

  return (
    <div
      className={`border-2 rounded-xl overflow-hidden ${isLive ? "animate-message-in" : ""}`}
      style={{
        borderColor: "var(--accent)",
        background: "var(--accent-5)",
        boxShadow: "0 4px 24px var(--accent-12)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: "var(--accent-8)", borderBottom: "1px solid var(--accent-20)" }}
      >
        <div className="flex-1 font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
          {round.isQA ? <MessageSquare size={16} /> : <Building2 size={16} />}
          {round.isQA ? "คำตอบ" : "มติที่ประชุม"}
          {chairmanEmoji && chairmanName && (
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>
              {chairmanEmoji} {chairmanName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onPin && (
            <button
              onClick={onPin}
              className="p-1.5 rounded-lg border transition-all hover:opacity-80"
              style={{
                borderColor: isPinned ? "var(--accent)" : "var(--border)",
                background: isPinned ? "var(--accent-15)" : "transparent",
                color: isPinned ? "var(--accent)" : "var(--text-muted)",
              }}
              title={isPinned ? "ปักหมุดไว้แล้ว" : "ปักหมุดมติ"}
            >
              <Pin size={13} />
            </button>
          )}
          <button
            onClick={copyText}
            className="p-1.5 rounded-lg border transition-all hover:opacity-80"
            style={{ borderColor: "var(--border)", color: copied ? "var(--green, #4ade80)" : "var(--text-muted)" }}
            title="คัดลอก"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <MessageContent content={round.finalAnswer ?? ""} />

        {round.chartData && <SimpleBarChart data={round.chartData} />}

        {/* Synth meta */}
        {synthMeta && (
          <div className="mt-4 pt-3 border-t space-y-3" style={{ borderColor: "var(--accent-20)" }}>
            {synthMeta.riskLevel && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>ความเสี่ยง:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${synthMeta.riskLevel === "high" ? "bg-red-100 text-red-700" : synthMeta.riskLevel === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {synthMeta.riskLevel === "high" ? "🔴 สูง" : synthMeta.riskLevel === "medium" ? "🟡 ปานกลาง" : "🟢 ต่ำ"}
                </span>
              </div>
            )}

            {(synthMeta.actionItems?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Check size={11} /> รายการที่ต้องดำเนินการ
                </div>
                <ActionItemList items={synthMeta.actionItems!} />
              </div>
            )}

            {(synthMeta.legalRefs?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <FileText size={11} /> อ้างอิงกฎหมาย
                </div>
                <div className="flex flex-wrap gap-1">
                  {synthMeta.legalRefs!.map((ref, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border font-mono" style={{ borderColor: "var(--accent-30)", color: "var(--accent)", background: "var(--accent-5)" }}>{ref}</span>
                  ))}
                </div>
              </div>
            )}

            {(synthMeta.deadlines?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={11} /> กำหนดเวลา
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {synthMeta.deadlines!.map((d, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>📅 {d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Web sources */}
        {webSources && webSources.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--accent-20)" }}>
            <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              แหล่งอ้างอิง ({webSources.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {webSources.map((src, si) => (
                <a key={si} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                  style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
                  title={src.snippet}
                >
                  <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{src.domain}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-3 pt-3 border-t text-[11px] leading-relaxed flex items-start gap-1" style={{ borderColor: "var(--accent-20)", color: "var(--text-muted)" }}>
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          คำตอบจาก AI เป็นข้อมูลเบื้องต้นเท่านั้น ควรตรวจสอบกับผู้เชี่ยวชาญหรืออ้างอิงกฎหมาย/มาตรฐานที่เกี่ยวข้องก่อนนำไปใช้จริง
        </div>
      </div>
    </div>
  );
}
