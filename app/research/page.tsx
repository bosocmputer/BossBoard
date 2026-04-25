"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Modal from "../components/Modal";
import { showToast } from "../components/Toast";
import {
  Building2, Settings, Download, Printer, Trash2, RefreshCw,
  History, X, AlertTriangle,
} from "lucide-react";

import { useMeetingSession } from "./hooks/useMeetingSession";
import { useMeetingSetup } from "./hooks/useMeetingSetup";
import { useServerHistory } from "./hooks/useServerHistory";
import { buildMinutesMarkdown } from "./utils";
import {
  ROLE_LABEL, ROLE_COLOR,
  type ConversationRound, type ServerSession, type ResearchMessage,
} from "./types";

// Components
import AgentSetupPanel from "./components/AgentSetupPanel";
import AdvancedSettingsSheet from "./components/AdvancedSettingsSheet";
import MeetingStartCard from "./components/MeetingStartCard";
import MeetingProgressBoard from "./components/MeetingProgressBoard";
import AgentMessageCard from "./components/AgentMessageCard";
import PhaseSeparator from "./components/PhaseSeparator";
import ThinkingRow from "./components/ThinkingRow";
import MeetingInputBar from "./components/MeetingInputBar";
import ClarificationCard from "./components/ClarificationCard";
import MeetingResolution from "./components/MeetingResolution";
import HistoryPanel from "./components/HistoryPanel";

export default function ResearchPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [pinnedRoundIdx, setPinnedRoundIdx] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setup = useMeetingSetup();
  const session = useMeetingSession(currentUserId);
  const history = useServerHistory();

  // Fetch on mount
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.id) setCurrentUserId(d.id); }).catch(() => {});
    setup.fetchAgents();
    setup.fetchSettings();
    history.fetchServerHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL params: ?q=, ?teamId=, ?sessionId=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setup.setQuestion(q);

    const teamId = params.get("teamId");
    if (teamId) {
      fetch(`/api/teams/${teamId}`)
        .then(r => r.json())
        .then(data => { if (data.team?.agentIds?.length) setup.setSelectedIds(new Set(data.team.agentIds)); })
        .catch(() => {});
    }

    const sessionId = params.get("sessionId");
    if (sessionId) {
      fetch(`/api/team-research/${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.session) {
            history.setViewingSession(data.session);
            if (data.session.agentIds?.length) setup.setSelectedIds(new Set(data.session.agentIds));
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.currentMessages, session.rounds, autoScroll]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distFromBottom < 80);
  };

  const runOpts = useCallback(() => ({
    question: setup.question,
    selectedIds: setup.selectedIds,
    effectiveMode: setup.effectiveMode,
    historyMode: setup.historyMode,
    useFileContext: setup.useFileContext,
    useMcpContext: setup.useMcpContext,
    includeCompanyInfo: setup.includeCompanyInfo,
    selectedClientId: setup.selectedClientId,
    buildFileContexts: setup.buildFileContexts,
    validateBeforeRun: setup.validateBeforeRun,
    clearQuestion: () => setup.setQuestion(""),
  }), [setup]);

  const handleRun = (overrideQuestion?: string, closeMode = false, withClarificationAnswers?: { question: string; answer: string }[]) => {
    session.handleRun(runOpts(), overrideQuestion, closeMode, withClarificationAnswers);
    setTimeout(() => { history.fetchServerHistory(); }, 2000);
  };

  const handleCloseMeeting = () => session.handleCloseMeeting(runOpts());
  const handleSkipToSummary = () => session.handleSkipToSummary(runOpts());
  const handleClarificationSubmit = () => session.handleClarificationSubmit(runOpts());
  const handleSkipClarification = () => session.handleSkipClarification(runOpts());

  const confirmClearSession = () => {
    if (session.rounds.length === 0) { session.clearSessionStorage(currentUserId); return; }
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    session.clearSessionStorage(currentUserId);
    showToast("info", "เริ่มการประชุมใหม่เรียบร้อย");
  };

  const exportMinutes = () => {
    let exportRounds: ConversationRound[];
    if (history.viewingSession) {
      exportRounds = [{
        question: history.viewingSession.question,
        messages: history.viewingSession.messages.map((m) => ({
          id: m.id, agentId: m.agentId, agentName: m.agentName, agentEmoji: m.agentEmoji,
          role: m.role, content: m.content, tokensUsed: m.tokensUsed,
          timestamp: m.timestamp || new Date().toISOString(),
        })),
        finalAnswer: history.viewingSession.finalAnswer || "",
        agentTokens: {}, suggestions: [],
      }];
    } else {
      if (session.rounds.length === 0) return;
      exportRounds = session.rounds;
    }
    const md = buildMinutesMarkdown(exportRounds, setup.agents);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const firstQ = exportRounds[0]?.question ?? "";
    const shortTitle = firstQ.replace(/[^฀-๿a-zA-Z0-9]+/g, "-").slice(0, 40).replace(/-+$/, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a"); a.href = url; a.download = `minutes-${shortTitle || "meeting"}-${dateStr}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const displayRounds = session.rounds;
  const isEmptyState = !history.viewingSession && displayRounds.length === 0 && session.currentMessages.length === 0 && !session.running && !session.pendingClarification;

  // Advanced settings props shared between sidebar and MeetingStartCard
  const advancedProps = {
    historyMode: setup.historyMode,
    onHistoryModeChange: (v: typeof setup.historyMode) => setup.setHistoryMode(v),
    useFileContext: setup.useFileContext,
    onToggleFileContext: () => setup.setUseFileContext(v => !v),
    useMcpContext: setup.useMcpContext,
    onToggleMcpContext: () => setup.setUseMcpContext(v => !v),
    includeCompanyInfo: setup.includeCompanyInfo,
    onToggleCompanyInfo: () => setup.setIncludeCompanyInfo(v => !v),
    selectedClientId: setup.selectedClientId,
    onClientChange: (id: string) => setup.setSelectedClientId(id),
    clientProfiles: setup.clientProfiles,
    attachedFiles: setup.attachedFiles,
    uploadingFile: setup.uploadingFile,
    uploadError: setup.uploadError,
    isDragOver: setup.isDragOver,
    fileInputRef: setup.fileInputRef,
    onFileInput: setup.handleFileInput,
    onDrop: setup.handleDrop,
    onDragOver: () => setup.setIsDragOver(true),
    onDragLeave: () => setup.setIsDragOver(false),
    onRemoveFile: setup.removeFile,
    onClearFiles: setup.clearFiles,
    onToggleSheet: setup.toggleSheet,
  };

  // ── Sidebar content ────────────────────────────────────────────────────────
  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      <AgentSetupPanel
        agents={setup.agents}
        selectedIds={setup.selectedIds}
        onToggle={setup.toggleAgent}
        onSelectAll={setup.selectAllAgents}
        onDeselectAll={setup.deselectAllAgents}
        running={session.running}
        chairmanId={session.chairmanId}
        searchingAgents={session.searchingAgents}
        activeAgentIds={session.activeAgentIds}
        phase1DoneCount={session.phase1DoneCount}
        currentPhase={session.currentPhase}
        agentTokens={session.agentTokens}
      />

      <button
        onClick={() => setup.setShowAdvanced(v => !v)}
        className="w-full text-left text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}
      >
        <Settings size={11} /> ตั้งค่าขั้นสูง {setup.showAdvanced ? "▲" : "▼"}
      </button>

      {setup.showAdvanced && <AdvancedSettingsSheet {...advancedProps} />}

      <HistoryPanel
        serverSessions={history.serverSessions}
        filteredSessions={history.filteredSessions}
        totalSessionCount={history.totalSessionCount}
        viewingSession={history.viewingSession}
        sessionSearch={history.sessionSearch}
        sessionStatusFilter={history.sessionStatusFilter}
        onSessionSearch={history.setSessionSearch}
        onStatusFilter={history.setSessionStatusFilter}
        onLoadSession={(s) => { history.loadServerSession(s); onNavigate?.(); }}
        onCloseSession={() => history.clearViewingSession()}
        onRefresh={history.fetchServerHistory}
        rounds={session.rounds}
        onClearSession={confirmClearSession}
      />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col p-3 sm:p-6 gap-3 sm:gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Building2 size={22} style={{ color: "var(--accent)" }} />
              <span>ห้องประชุม{setup.companyName ? ` — ${setup.companyName}` : ""}</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1 hidden sm:block" style={{ color: "var(--text-muted)" }}>
              ห้องประชุม AI — ประธานนำทีมถกเถียงและสรุปมติทุกวาระ
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden px-3 py-2 rounded-lg text-xs border flex items-center gap-1.5" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}>
              <Settings size={14} /> ตั้งค่า ({setup.selectedIds.size})
            </button>
            {(session.rounds.length > 0 || history.viewingSession) && (
              <>
                <button onClick={exportMinutes} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="Export รายงานการประชุม">
                  <Download size={14} /> Export
                </button>
                <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="พิมพ์ / บันทึก PDF">
                  <Printer size={14} /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

          {/* Mobile sidebar overlay */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-[55] md:hidden">
              <button className="absolute inset-0 bg-black/45" onClick={() => setMobileSidebarOpen(false)} aria-label="Close panel" />
              <aside className="absolute top-0 left-0 bottom-0 w-[300px] max-w-[88vw] border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="h-14 px-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                  <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text)" }}><Settings size={14} /> ตั้งค่าการประชุม</div>
                  <button onClick={() => setMobileSidebarOpen(false)} className="w-8 h-8 rounded-lg border text-base" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}>×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                  {renderSidebarContent(() => setMobileSidebarOpen(false))}
                </div>
              </aside>
            </div>
          )}

          {/* Left sidebar (desktop) */}
          <div className="hidden md:flex flex-col gap-3 w-64 flex-shrink-0">
            {renderSidebarContent()}
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-w-0">

            {/* Viewing server session banner */}
            {history.viewingSession && (
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs" style={{ borderColor: "var(--accent-35)", background: "var(--accent-7)", color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1" style={{ color: "var(--accent)" }}><History size={12} /> ดูประวัติ</span>
                <span className="flex-1 truncate">{history.viewingSession.question}</span>
                <button onClick={() => history.clearViewingSession()} className="ml-2 px-2 py-0.5 rounded border opacity-60 hover:opacity-100 flex items-center gap-1" style={{ borderColor: "var(--border)" }}>
                  <X size={12} /> ปิด
                </button>
              </div>
            )}

            {/* Empty state — show MeetingStartCard */}
            {isEmptyState && (
              <MeetingStartCard
                companyName={setup.companyName}
                agents={setup.agents}
                selectedIds={setup.selectedIds}
                onToggleAgent={setup.toggleAgent}
                onSelectAll={setup.selectAllAgents}
                onDeselectAll={setup.deselectAllAgents}
                question={setup.question}
                onQuestionChange={setup.setQuestion}
                onRun={(q) => handleRun(q)}
                showAdvanced={setup.showAdvanced}
                onToggleAdvanced={() => setup.setShowAdvanced(v => !v)}
                {...advancedProps}
              />
            )}

            {/* Messages area */}
            {!isEmptyState && (
              <>
                {/* Phase progress board */}
                <MeetingProgressBoard
                  running={session.running}
                  status={session.status}
                  currentPhase={session.currentPhase}
                  phase1DoneCount={session.phase1DoneCount.size}
                  totalAgents={setup.selectedIds.size}
                  elapsedTime={session.elapsedTime}
                  isSynthesizing={session.isSynthesizing}
                  effectiveMode={setup.effectiveMode}
                  onSkipToSummary={handleSkipToSummary}
                  onStop={session.handleStop}
                />

                {/* Persistent meeting state badge (not running) */}
                {!session.running && (session.rounds.length > 0 || session.meetingSessionId) && (
                  <div className="mx-1">
                    <div className="rounded-lg px-3 py-2 border flex items-center gap-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      {session.meetingSessionId && !session.rounds.some(r => r.isSynthesis) ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>รอวาระถัดไป — พิมพ์วาระใหม่หรือกด <strong style={{ color: "var(--accent)" }}>สรุปมติ</strong> เมื่อพร้อมปิดประชุม</span>
                        </>
                      ) : session.rounds.some(r => r.isSynthesis) ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--green)" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--green)" }}>✅ ประชุมเสร็จสิ้น — มีมติที่ประชุมแล้ว</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>มีข้อมูลการประชุม {session.rounds.filter(r => !r.isSynthesis).length} วาระ</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 min-h-[200px] sm:min-h-[300px] relative"
                >
                  {/* Synthesis loading banner */}
                  {session.isSynthesizing && !session.currentFinalAnswer && (
                    <div className="mx-1 rounded-xl border-2 p-4 flex items-center gap-3" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>🏛️ ประธานกำลังสรุปมติ...</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>กรุณารอสักครู่ ประมาณ 15–30 วินาที</div>
                      </div>
                    </div>
                  )}

                  {/* Clarification card */}
                  {session.pendingClarification && session.clarificationQuestions.length > 0 && (
                    <ClarificationCard
                      questions={session.clarificationQuestions}
                      answers={session.clarificationAnswers}
                      onAnswerChange={(id, val) => session.setClarificationAnswers(prev => ({ ...prev, [id]: val }))}
                      onSubmit={handleClarificationSubmit}
                      onSkip={handleSkipClarification}
                    />
                  )}

                  {/* Viewing server session */}
                  {history.viewingSession && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "#000" }}>
                          {history.viewingSession.question}
                        </div>
                      </div>
                      {history.viewingSession.messages.filter((msg) => msg.role !== "thinking").map((msg) => (
                        <AgentMessageCard
                          key={msg.id}
                          emoji={msg.agentEmoji}
                          name={msg.agentName}
                          role={msg.role}
                          roleLabel={ROLE_LABEL[msg.role] ?? msg.role}
                          roleColorClass={ROLE_COLOR[msg.role] ?? ""}
                          content={msg.content}
                          isChairman={false}
                        />
                      ))}
                      {history.viewingSession.status === "running" && !history.viewingSession.finalAnswer && (
                        <div className="border-2 border-dashed rounded-xl p-4 text-center space-y-3" style={{ borderColor: "var(--warning, #f59e0b)", background: "var(--surface)" }}>
                          <div className="flex items-center justify-center gap-2 text-sm font-bold" style={{ color: "var(--warning, #f59e0b)" }}>
                            <AlertTriangle size={16} /> ประชุมค้าง — ไม่ได้ปิดประชุม
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>เซสชันนี้ยังค้างสถานะ &quot;กำลังประชุม&quot; — เลือกดำเนินการ</p>
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={async () => {
                                await fetch(`/api/team-research/${history.viewingSession!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "force-complete", reason: "🔒 ปิดประชุมโดยผู้ใช้" }) });
                                history.setViewingSession({ ...history.viewingSession!, status: "completed", finalAnswer: "🔒 ปิดประชุมโดยผู้ใช้" });
                                history.fetchServerHistory();
                              }}
                              className="text-xs px-4 py-2 rounded-lg border font-bold"
                              style={{ borderColor: "var(--error, #ef4444)", color: "var(--error, #ef4444)" }}
                            ><X size={12} className="inline mr-1" /> ปิดประชุม</button>
                            <button
                              onClick={() => {
                                if (history.viewingSession?.agentIds) setup.setSelectedIds(new Set(history.viewingSession.agentIds));
                                const priorRound: ConversationRound = {
                                  question: history.viewingSession!.question,
                                  messages: history.viewingSession!.messages.map((m: ServerSession["messages"][0]) => ({ id: m.id, agentId: m.agentId, agentName: m.agentName, agentEmoji: m.agentEmoji, role: m.role, content: m.content, tokensUsed: m.tokensUsed, timestamp: m.timestamp || new Date().toISOString() })),
                                  finalAnswer: "", agentTokens: {}, suggestions: [],
                                };
                                fetch(`/api/team-research/${history.viewingSession!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "force-complete", reason: "🔄 ย้ายไปเซสชันใหม่" }) }).catch(() => {});
                                session.clearSession();
                                session.setRounds([priorRound]);
                                session.setMeetingSessionId(null);
                                session.meetingSessionIdRef.current = null;
                                setup.setQuestion("");
                                history.clearViewingSession();
                                history.fetchServerHistory();
                              }}
                              className="text-xs px-4 py-2 rounded-lg border font-bold"
                              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                            ><RefreshCw size={12} className="inline mr-1" /> ถามต่อในเซสชันใหม่</button>
                          </div>
                        </div>
                      )}
                      {history.viewingSession.finalAnswer && (
                        <MeetingResolution
                          round={{
                            finalAnswer: history.viewingSession.finalAnswer,
                            isQA: (history.viewingSession.agentIds?.length ?? 0) <= 1,
                            chartData: undefined,
                            synthMeta: undefined,
                            webSources: undefined,
                          }}
                        />
                      )}
                      {history.viewingSession.finalAnswer && (
                        <button
                          onClick={() => {
                            if (history.viewingSession?.agentIds) setup.setSelectedIds(new Set(history.viewingSession.agentIds));
                            const priorRound: ConversationRound = {
                              question: history.viewingSession!.question,
                              messages: history.viewingSession!.messages.map((m: ServerSession["messages"][0]) => ({ id: m.id, agentId: m.agentId, agentName: m.agentName, agentEmoji: m.agentEmoji, role: m.role, content: m.content, tokensUsed: m.tokensUsed, timestamp: m.timestamp || new Date().toISOString() })),
                              finalAnswer: history.viewingSession!.finalAnswer || "", agentTokens: {}, suggestions: [],
                            };
                            session.clearSession();
                            session.setRounds([priorRound]);
                            session.setMeetingSessionId(null);
                            session.meetingSessionIdRef.current = null;
                            setup.setQuestion("");
                            history.clearViewingSession();
                            const clarAnswers = history.viewingSession!.messages.filter((m: ServerSession["messages"][0]) => m.role === "clarification" as unknown as ResearchMessage["role"]).map((m: ServerSession["messages"][0]) => ({ question: m.agentName || "", answer: m.content || "" })).filter((qa: { question: string; answer: string }) => qa.question && qa.answer);
                            if (clarAnswers.length > 0) session.lastClarificationAnswersRef.current = clarAnswers;
                          }}
                          className="mt-2 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        ><RefreshCw size={12} /> นำวาระนี้กลับมาประชุมอีกครั้ง</button>
                      )}
                    </div>
                  )}

                  {/* Current session rounds */}
                  {!history.viewingSession && displayRounds.map((round, roundIndex) => {
                    const isResolution = !!round.finalAnswer;
                    const chairmanAgent = round.chairmanId ? setup.agents.find(a => a.id === round.chairmanId) : undefined;

                    return (
                      <div key={roundIndex} className="space-y-3">
                        {(round.isSynthesis || displayRounds.filter(r => !r.isSynthesis).length > 1) && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                            <div className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: "var(--accent)", color: round.isSynthesis ? "#000" : "var(--accent)", background: round.isSynthesis ? "var(--accent)" : "var(--accent-8)", fontWeight: round.isSynthesis ? 700 : 400 }}>
                              {round.isSynthesis ? "สรุปมติที่ประชุม" : round.isQA ? `คำถามที่ ${roundIndex + 1}` : `วาระที่ ${roundIndex + 1}`}
                            </div>
                            <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                          </div>
                        )}

                        {!round.isSynthesis && (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "#000" }}>
                              {round.question}
                            </div>
                          </div>
                        )}

                        {(() => {
                          let lastPhaseRole = "";
                          return round.messages.filter((msg) => msg.role !== "thinking").map((msg) => {
                            const elements: React.ReactNode[] = [];
                            if (msg.role !== lastPhaseRole && lastPhaseRole !== "") {
                              if (msg.role === "chat") {
                                elements.push(<PhaseSeparator key={`sep-${msg.id}`} icon="💬" label="เริ่มการถกเถียง" color="var(--orange)" />);
                              } else if (msg.role === "synthesis") {
                                elements.push(<PhaseSeparator key={`sep-${msg.id}`} icon="🏛️" label="ประธานสรุปมติ" color="var(--accent)" />);
                              }
                            }
                            lastPhaseRole = msg.role;
                            elements.push(
                              <AgentMessageCard
                                key={msg.id}
                                emoji={msg.agentEmoji}
                                name={msg.agentName}
                                role={msg.role}
                                roleLabel={ROLE_LABEL[msg.role] ?? msg.role}
                                roleColorClass={ROLE_COLOR[msg.role] ?? ""}
                                content={msg.content}
                                isChairman={round.chairmanId === msg.agentId}
                              />
                            );
                            return elements;
                          });
                        })()}

                        {isResolution && (
                          <MeetingResolution
                            round={round}
                            chairmanEmoji={chairmanAgent?.emoji}
                            chairmanName={chairmanAgent?.name}
                            onPin={() => setPinnedRoundIdx(prev => prev === roundIndex ? null : roundIndex)}
                            isPinned={pinnedRoundIdx === roundIndex}
                          />
                        )}

                        {roundIndex === displayRounds.length - 1 && round.suggestions.length > 0 && !session.running && session.currentMessages.length === 0 && (
                          <div className="space-y-2">
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>วาระต่อเนื่องที่แนะนำ:</div>
                            <div className="flex flex-col gap-1.5">
                              {round.suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleRun(s)} disabled={session.running}
                                  className="text-left px-3 py-2 rounded-lg border text-xs transition-all hover:opacity-80 disabled:opacity-40"
                                  style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
                                >→ {s}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Current round in progress */}
                  {!history.viewingSession && (session.currentMessages.length > 0 || session.running) && (
                    <div className="space-y-3">
                      {(session.isCurrentClosing || displayRounds.filter(r => !r.isSynthesis).length > 0) && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 border-t" style={{ borderColor: session.isCurrentClosing ? "var(--accent)" : "var(--border)" }} />
                          <div className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: "var(--accent)", color: session.isCurrentClosing ? "#000" : "var(--accent)", background: session.isCurrentClosing ? "var(--accent)" : "var(--accent-8)", fontWeight: session.isCurrentClosing ? 700 : 400 }}>
                            {session.isCurrentClosing ? "สรุปมติที่ประชุม" : `วาระที่ ${displayRounds.filter(r => !r.isSynthesis).length + 1}`}
                          </div>
                          <div className="flex-1 border-t" style={{ borderColor: session.isCurrentClosing ? "var(--accent)" : "var(--border)" }} />
                        </div>
                      )}

                      {(() => {
                        let lastPhaseRole = "";
                        let thinkingIdx = 0;
                        const thinkingAgents = session.currentMessages.filter(m => m.role === "thinking");

                        return session.currentMessages.map((msg) => {
                          const elements: React.ReactNode[] = [];

                          // Phase transition separators
                          if (msg.role !== "thinking" && msg.role !== lastPhaseRole && lastPhaseRole !== "") {
                            if (msg.role === "chat" && lastPhaseRole === "finding") {
                              const findingCount = session.currentMessages.filter(m => m.role === "finding").length;
                              elements.push(
                                <div key={`phase1-done-${msg.id}`} className="flex items-center justify-center py-1.5 animate-phase-reveal">
                                  <span className="text-[11px] px-3 py-1 rounded-full font-medium" style={{ color: "var(--accent)", background: "var(--accent-8)" }}>
                                    ✓ รับฟังความเห็นครบแล้ว — {findingCount} คน
                                  </span>
                                </div>
                              );
                            }
                            if (msg.role === "chat") {
                              elements.push(<PhaseSeparator key={`sep-${msg.id}`} icon="💬" label="เริ่มการถกเถียง" color="var(--orange)" isLive />);
                            } else if (msg.role === "synthesis") {
                              elements.push(<PhaseSeparator key={`sep-${msg.id}`} icon="🏛️" label="ประธานสรุปมติ" color="var(--accent)" isLive />);
                            }
                          }
                          if (msg.role !== "thinking") lastPhaseRole = msg.role;

                          // Thinking row
                          if (msg.role === "thinking") {
                            if (thinkingIdx === 0) {
                              elements.push(
                                <ThinkingRow key="thinking-group" agents={thinkingAgents.map(t => ({ id: t.id, emoji: t.agentEmoji, name: t.agentName }))} />
                              );
                            }
                            thinkingIdx++;
                          } else {
                            elements.push(
                              <AgentMessageCard
                                key={msg.id}
                                emoji={msg.agentEmoji}
                                name={msg.agentName}
                                role={msg.role}
                                roleLabel={ROLE_LABEL[msg.role] ?? msg.role}
                                roleColorClass={ROLE_COLOR[msg.role] ?? ""}
                                content={msg.content}
                                isChairman={session.chairmanId === msg.agentId}
                                isLive
                              />
                            );
                          }
                          return elements;
                        });
                      })()}

                      {session.currentFinalAnswer && (() => {
                        const chairmanAgent = session.chairmanId ? setup.agents.find(a => a.id === session.chairmanId) : undefined;
                        return (
                          <MeetingResolution
                            round={{
                              finalAnswer: session.currentFinalAnswer,
                              isQA: session.isCurrentQA,
                              chartData: session.currentChartData ?? undefined,
                              synthMeta: session.currentSynthMeta ?? undefined,
                              webSources: session.currentWebSources ?? undefined,
                            }}
                            chairmanEmoji={chairmanAgent?.emoji}
                            chairmanName={chairmanAgent?.name}
                            isLive
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* Jump to summary button */}
                  {session.currentFinalAnswer && !autoScroll && (
                    <div className="sticky bottom-3 flex justify-center z-10 pointer-events-none">
                      <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                        className="pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all hover:scale-105 animate-message-in"
                        style={{ background: "var(--accent)", color: "#000" }}
                      >↓ ดูผลสรุป</button>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                {!history.viewingSession && (
                  <MeetingInputBar
                    question={setup.question}
                    onQuestionChange={setup.setQuestion}
                    onRun={() => handleRun()}
                    onStop={session.handleStop}
                    onSkipToSummary={handleSkipToSummary}
                    onCloseMeeting={handleCloseMeeting}
                    running={session.running}
                    effectiveMode={setup.effectiveMode}
                    forceMode={setup.forceMode}
                    onToggleMode={() => setup.setForceMode(prev => prev === "auto" ? (setup.effectiveMode === "qa" ? "meeting" : "qa") : "auto")}
                    meetingSessionId={session.meetingSessionId}
                    elapsedTime={session.elapsedTime}
                    rounds={session.rounds}
                    selectedCount={setup.selectedIds.size}
                    totalAgents={setup.agents.length}
                    attachedFilesCount={setup.attachedFiles.length}
                    showAdvanced={setup.showAdvanced}
                    onToggleAdvanced={() => setup.setShowAdvanced(v => !v)}
                    showTemplates={setup.showTemplates}
                    onToggleTemplates={() => setup.setShowTemplates(v => !v)}
                    onSelectTemplate={(t) => { setup.setQuestion(t); setup.setShowTemplates(false); }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm clear modal */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="เริ่มการประชุมใหม่?" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            ล้างข้อมูลการประชุม {session.rounds.filter(r => !r.isSynthesis).length} วาระ จากหน้าจอ
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            ประวัติการประชุมบน server ยังคงอยู่ — สามารถดูย้อนหลังได้ในแท็บประวัติ
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--surface)]" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ยกเลิก</button>
            <button onClick={handleConfirmClear} className="px-4 py-2 text-sm rounded-lg font-medium transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
              <span className="flex items-center gap-1.5"><Trash2 size={14} /> เริ่มใหม่</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
