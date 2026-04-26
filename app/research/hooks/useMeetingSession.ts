"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  ResearchMessage, AgentTokenState, ChartData, SynthesisMetadata,
  ConversationRound, ClarificationQuestion, WebSource, ConversationTurn, MidMeetingQuestion,
} from "../types";
import { STORAGE_KEY_PREFIX } from "../types";
import { showToast } from "../../components/Toast";

interface RunOptions {
  question: string;
  selectedIds: Set<string>;
  effectiveMode: "qa" | "meeting";
  historyMode: string;
  useFileContext: boolean;
  useMcpContext: boolean;
  selectedClientId: string;
  buildFileContexts: () => { filename: string; meta: string; context: string; sheets?: string[] }[] | undefined;
  validateBeforeRun: (closeMode: boolean) => boolean;
  clearQuestion: () => void;
  midMeetingAnswers?: { questionId: string; answer: string }[];
}

export function useMeetingSession(currentUserId: string | null) {
  const [running, setRunning] = useState(false);
  const [agentTokens, setAgentTokens] = useState<Record<string, AgentTokenState>>({});
  const [status, setStatus] = useState("");
  const [chairmanId, setChairmanId] = useState<string | null>(null);
  const [searchingAgents, setSearchingAgents] = useState<Set<string>>(new Set());
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set());
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2 | 3>(0);
  const [phase1DoneCount, setPhase1DoneCount] = useState<Set<string>>(new Set());
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [pendingClarification, setPendingClarification] = useState(false);

  const [midMeetingQuestion, setMidMeetingQuestion] = useState<MidMeetingQuestion | null>(null);
  const [midMeetingAnswers, setMidMeetingAnswers] = useState<{ questionId: string; answer: string }[]>([]);

  const [currentWebSources, setCurrentWebSources] = useState<WebSource[]>([]);
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [rounds, setRounds] = useState<ConversationRound[]>([]);
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ResearchMessage[]>([]);
  const [currentFinalAnswer, setCurrentFinalAnswer] = useState("");
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);
  const [currentSynthMeta, setCurrentSynthMeta] = useState<SynthesisMetadata | null>(null);
  const [isCurrentQA, setIsCurrentQA] = useState(false);
  const [isCurrentClosing, setIsCurrentClosing] = useState(false);

  // Refs to avoid stale closures in async SSE handler
  const currentFinalAnswerRef = useRef("");
  const currentMessagesRef = useRef<ResearchMessage[]>([]);
  const currentSuggestionsRef = useRef<string[]>([]);
  const currentChartDataRef = useRef<ChartData | null>(null);
  const currentSynthMetaRef = useRef<SynthesisMetadata | null>(null);
  const chairmanIdRef = useRef<string | null>(null);
  const meetingSessionIdRef = useRef<string | null>(null);
  const currentWebSourcesRef = useRef<WebSource[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const streamFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClarificationQuestionRef = useRef<string>("");
  const lastClarificationAnswersRef = useRef<{ question: string; answer: string }[] | undefined>(undefined);
  const skipToSummaryRef = useRef(false);
  const handleCloseRef = useRef<() => void>(() => {});

  // Sync refs with state
  useEffect(() => { currentFinalAnswerRef.current = currentFinalAnswer; }, [currentFinalAnswer]);
  useEffect(() => { currentMessagesRef.current = currentMessages; }, [currentMessages]);
  useEffect(() => { currentSuggestionsRef.current = currentSuggestions; }, [currentSuggestions]);
  useEffect(() => { currentChartDataRef.current = currentChartData; }, [currentChartData]);
  useEffect(() => { currentSynthMetaRef.current = currentSynthMeta; }, [currentSynthMeta]);
  useEffect(() => { chairmanIdRef.current = chairmanId; }, [chairmanId]);
  useEffect(() => { meetingSessionIdRef.current = meetingSessionId; }, [meetingSessionId]);
  useEffect(() => { currentWebSourcesRef.current = currentWebSources; }, [currentWebSources]);

  // Load from localStorage
  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = `${STORAGE_KEY_PREFIX}_${currentUserId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rounds) setRounds(parsed.rounds);
        if (parsed.meetingSessionId) {
          setMeetingSessionId(parsed.meetingSessionId);
          meetingSessionIdRef.current = parsed.meetingSessionId;
        }
      }
    } catch { /* ignore */ }
  }, [currentUserId]);

  // Save to localStorage
  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = `${STORAGE_KEY_PREFIX}_${currentUserId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ rounds, meetingSessionId }));
    } catch { /* ignore */ }
  }, [rounds, meetingSessionId, currentUserId]);

  // Meeting timer
  useEffect(() => {
    if (!meetingStartTime) return;
    const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - meetingStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  // Force-complete on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = meetingSessionIdRef.current;
      if (sid) {
        const payload = JSON.stringify({ action: "force-complete", reason: "📡 การเชื่อมต่อถูกตัด" });
        navigator.sendBeacon(`/api/team-research/${sid}`, new Blob([payload], { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const buildHistory = useCallback((): ConversationTurn[] =>
    rounds.filter(r => !r.isSynthesis).map((r) => ({
      question: r.question,
      answer: r.finalAnswer || r.messages
        .filter(m => m.role === "finding" || m.role === "chat" || m.role === "synthesis")
        .map(m => `${m.agentEmoji} ${m.agentName}: ${m.content.slice(0, 500)}`)
        .join("\n---\n"),
    })),
  [rounds]);

  const handleRun = useCallback(async (
    opts: RunOptions,
    overrideQuestion?: string,
    closeMode = false,
    withClarificationAnswers?: { question: string; answer: string }[]
  ) => {
    const q = closeMode
      ? (rounds[0]?.question ?? "สรุปมติที่ประชุม")
      : (overrideQuestion ?? opts.question).trim();

    if (!opts.validateBeforeRun(closeMode)) return;
    if (!closeMode && (!q || running)) return;
    if (closeMode && (rounds.length === 0 || running)) return;

    const isQA = !closeMode && opts.effectiveMode === "qa";

    setRunning(true);
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setIsCurrentQA(isQA);
    setIsCurrentClosing(!!closeMode);
    if (!meetingStartTime && !isQA) setMeetingStartTime(Date.now());
    setCurrentSuggestions([]);
    setCurrentChartData(null);
    setAgentTokens({});
    setCurrentWebSources([]);
    currentWebSourcesRef.current = [];
    lastClarificationAnswersRef.current = withClarificationAnswers;
    setStatus(closeMode ? "ประธานกำลังสรุปมติที่ประชุม..." : isQA ? "กำลังตอบ..." : "");
    setChairmanId(null);
    setSearchingAgents(new Set());
    setPendingClarification(false);
    setClarificationQuestions([]);
    setClarificationAnswers({});
    pendingClarificationQuestionRef.current = q;
    setActiveAgentIds(new Set());
    setCurrentPhase(0);
    setPhase1DoneCount(new Set());
    setIsSynthesizing(false);
    if (!overrideQuestion && !closeMode) opts.clearQuestion();

    abortRef.current = new AbortController();
    const roundTokens: Record<string, AgentTokenState> = {};

    try {
      const body: Record<string, unknown> = {
        question: q,
        agentIds: Array.from(opts.selectedIds),
        mode: closeMode ? "close" : isQA ? "qa" : "full",
        sessionId: meetingSessionIdRef.current || undefined,
        conversationHistory: buildHistory(),
        fileContexts: opts.useFileContext ? opts.buildFileContexts() : [],
        historyMode: opts.historyMode,
        disableMcp: !opts.useMcpContext,
        clarificationAnswers: withClarificationAnswers || undefined,
        clientId: opts.selectedClientId || undefined,
        midMeetingAnswers: opts.midMeetingAnswers?.length ? opts.midMeetingAnswers : undefined,
      };

      if (closeMode) {
        const ALL_ROUNDS_MSG_CAP = 1500;
        body.allRounds = rounds.filter(r => !r.isSynthesis).map(r => ({
          question: r.question,
          messages: r.messages.filter(m => m.role !== "thinking").map(m => ({
            ...m,
            content: m.content.length > ALL_ROUNDS_MSG_CAP
              ? m.content.slice(0, Math.floor(ALL_ROUNDS_MSG_CAP * 0.7)) + "\n[...]\n" + m.content.slice(-Math.floor(ALL_ROUNDS_MSG_CAP * 0.3))
              : m.content,
          })),
        }));
      }

      const res = await fetch("/api/team-research/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (currentEvent === "session") {
              if (!meetingSessionIdRef.current) {
                meetingSessionIdRef.current = payload.sessionId;
                setMeetingSessionId(payload.sessionId);
              }
            } else if (currentEvent === "status" || ("message" in payload && typeof payload.message === "string")) {
              setStatus(payload.message);
            } else if (currentEvent === "chairman") {
              setChairmanId(payload.agentId);
              chairmanIdRef.current = payload.agentId;
            } else if (currentEvent === "agent_start" || currentEvent === "agent_searching") {
              setActiveAgentIds((prev) => new Set([...prev, payload.agentId]));
              if (currentEvent === "agent_searching") {
                setSearchingAgents((prev) => new Set([...prev, payload.agentId]));
              }
            } else if (currentEvent === "message" || ("content" in payload && "agentId" in payload)) {
              const msg = payload as ResearchMessage;
              setSearchingAgents((prev) => { const n = new Set(prev); n.delete(msg.agentId); return n; });
              if (msg.role !== "thinking") {
                setActiveAgentIds((prev) => { const n = new Set(prev); n.delete(msg.agentId); return n; });
                // Role-based phase detection (reliable vs string-matching)
                if (msg.role === "finding") {
                  setCurrentPhase(1);
                  setPhase1DoneCount((prev) => new Set([...prev, msg.agentId]));
                } else if (msg.role === "chat") {
                  setCurrentPhase(2);
                } else if (msg.role === "synthesis") {
                  setCurrentPhase(3);
                  setIsSynthesizing(true);
                }
              }
              setCurrentMessages((prev) => [...prev, msg]);
            } else if (currentEvent === "final_answer_delta") {
              currentFinalAnswerRef.current = (currentFinalAnswerRef.current || "") + payload.content;
              if (!streamFlushRef.current) {
                streamFlushRef.current = setTimeout(() => {
                  setCurrentFinalAnswer(currentFinalAnswerRef.current);
                  streamFlushRef.current = null;
                }, 80);
              }
            } else if (currentEvent === "final_answer" || ("content" in payload && !("agentId" in payload))) {
              if (streamFlushRef.current) { clearTimeout(streamFlushRef.current); streamFlushRef.current = null; }
              currentFinalAnswerRef.current = payload.content;
              setCurrentFinalAnswer(payload.content);
              setIsSynthesizing(false);
            } else if (currentEvent === "agent_tokens" || ("inputTokens" in payload)) {
              const t = { inputTokens: payload.inputTokens, outputTokens: payload.outputTokens, totalTokens: payload.totalTokens };
              roundTokens[payload.agentId] = t;
              setAgentTokens((prev) => ({ ...prev, [payload.agentId]: t }));
            } else if (currentEvent === "follow_up_suggestions" || "suggestions" in payload) {
              setCurrentSuggestions(payload.suggestions);
            } else if (currentEvent === "chart_data") {
              setCurrentChartData(payload);
            } else if (currentEvent === "synthesis_metadata") {
              setCurrentSynthMeta(payload as SynthesisMetadata);
            } else if (currentEvent === "error") {
              setStatus(`⚠️ ${payload.message || "เกิดข้อผิดพลาด"}`);
            } else if (currentEvent === "clarification_needed") {
              setClarificationQuestions(payload.questions ?? []);
              setClarificationAnswers({});
              setPendingClarification(true);
            } else if (currentEvent === "mid_meeting_question") {
              setMidMeetingQuestion(payload as MidMeetingQuestion);
            } else if (currentEvent === "web_sources") {
              const newSources: WebSource[] = payload.sources ?? [];
              setCurrentWebSources((prev) => {
                const seen = new Set(prev.map((s) => s.url));
                const fresh = newSources.filter((s: WebSource) => !seen.has(s.url));
                const merged = [...prev, ...fresh];
                currentWebSourcesRef.current = merged;
                return merged;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus(`Error: ${e.message}`);
      }
    } finally {
      setRunning(false);
      setSearchingAgents(new Set());
      setActiveAgentIds(new Set());
      setCurrentPhase(0);
      setPhase1DoneCount(new Set());

      // Fallback recovery if stream ended with no data
      if (
        currentMessagesRef.current.length === 0 &&
        !currentFinalAnswerRef.current &&
        meetingSessionIdRef.current
      ) {
        try {
          const fallbackRes = await fetch(`/api/team-research/${meetingSessionIdRef.current}`);
          if (fallbackRes.ok) {
            const session = await fallbackRes.json();
            if (session.status === "completed" && (session.messages?.length > 0 || session.finalAnswer)) {
              if (session.messages?.length > 0) {
                currentMessagesRef.current = session.messages.map((m: ResearchMessage) => ({
                  id: m.id, agentId: m.agentId, agentName: m.agentName, agentEmoji: m.agentEmoji,
                  role: m.role, content: m.content, tokensUsed: m.tokensUsed,
                  timestamp: m.timestamp || new Date().toISOString(),
                }));
              }
              if (session.finalAnswer) currentFinalAnswerRef.current = session.finalAnswer;
            }
          }
        } catch { /* fallback failed */ }
      }

      if (currentMessagesRef.current.length > 0 || currentFinalAnswerRef.current) {
        setRounds((prev) => [
          ...prev,
          {
            question: closeMode ? "🏛️ สรุปมติที่ประชุม" : q,
            messages: currentMessagesRef.current,
            finalAnswer: currentFinalAnswerRef.current,
            agentTokens: roundTokens,
            suggestions: currentSuggestionsRef.current,
            chartData: currentChartDataRef.current ?? undefined,
            synthMeta: currentSynthMetaRef.current ?? undefined,
            chairmanId: chairmanIdRef.current ?? undefined,
            isSynthesis: closeMode,
            isQA,
            webSources: currentWebSourcesRef.current.length > 0 ? currentWebSourcesRef.current : undefined,
            clarificationAnswers: lastClarificationAnswersRef.current?.length ? lastClarificationAnswersRef.current : undefined,
          },
        ]);
      }

      if (skipToSummaryRef.current && !closeMode) {
        skipToSummaryRef.current = false;
        // Only trigger close-summary if no synthesis was already produced this round.
        // Otherwise we'd save a duplicate synthesis message.
        const hasSynthesis = !!currentFinalAnswerRef.current
          || currentMessagesRef.current.some(m => m.role === "synthesis");
        if (!hasSynthesis) {
          setTimeout(() => handleCloseRef.current(), 300);
        }
      }

      if (closeMode) {
        setMeetingSessionId(null);
        meetingSessionIdRef.current = null;
        setMeetingStartTime(null);
        setElapsedTime(0);
        showToast("success", "ปิดประชุมแล้ว — บันทึกสรุปมติแล้ว ✓");
      }

      setCurrentMessages([]);
      setCurrentFinalAnswer("");
      if (streamFlushRef.current) { clearTimeout(streamFlushRef.current); streamFlushRef.current = null; }
      setCurrentSuggestions([]);
      setCurrentChartData(null);
      setCurrentSynthMeta(null);
      setCurrentWebSources([]);
      currentWebSourcesRef.current = [];
      setChairmanId(null);
      setIsCurrentClosing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, rounds, meetingStartTime, buildHistory]);

  const handleClarificationSubmit = useCallback((opts: RunOptions) => {
    const answers = clarificationQuestions.map((q) => ({
      question: q.question,
      answer: clarificationAnswers[q.id] || "(ไม่ระบุ)",
    }));
    setPendingClarification(false);
    setClarificationQuestions([]);
    handleRun(opts, pendingClarificationQuestionRef.current || undefined, false, answers);
  }, [clarificationQuestions, clarificationAnswers, handleRun]);

  const handleSkipClarification = useCallback((opts: RunOptions) => {
    setPendingClarification(false);
    setClarificationQuestions([]);
    handleRun(opts, pendingClarificationQuestionRef.current || undefined, false, []);
  }, [handleRun]);

  const handleMidMeetingAnswer = useCallback((opts: RunOptions, questionId: string, answer: string) => {
    const newAnswers = [...midMeetingAnswers, { questionId, answer }];
    setMidMeetingAnswers(newAnswers);
    setMidMeetingQuestion(null);
    handleRun({ ...opts, midMeetingAnswers: newAnswers }, pendingClarificationQuestionRef.current || undefined, false);
  }, [midMeetingAnswers, handleRun]);

  const handleSkipMidMeetingQuestion = useCallback((opts: RunOptions, questionId: string) => {
    const skipped = [...midMeetingAnswers, { questionId, answer: "(ข้ามคำถาม)" }];
    setMidMeetingAnswers(skipped);
    setMidMeetingQuestion(null);
    handleRun({ ...opts, midMeetingAnswers: skipped }, pendingClarificationQuestionRef.current || undefined, false);
  }, [midMeetingAnswers, handleRun]);

  const handleCloseMeeting = useCallback((opts: RunOptions) => {
    handleRun(opts, undefined, true);
  }, [handleRun]);

  // Store ref for skip-to-summary chain
  useEffect(() => {
    handleCloseRef.current = () => { /* will be set by page via opts */ };
  }, []);

  const handleSkipToSummary = useCallback((opts: RunOptions) => {
    const hasData = currentMessagesRef.current.some(m =>
      m.role === "finding" || m.role === "chat" || m.role === "analysis" || m.role === "synthesis"
    );
    if (!hasData && rounds.length === 0) {
      showToast("warning", "ยังไม่มีข้อมูลเพียงพอ — รอให้ agent นำเสนอก่อน");
      return;
    }
    skipToSummaryRef.current = true;
    handleCloseRef.current = () => handleCloseMeeting(opts);
    abortRef.current?.abort();
  }, [rounds.length, handleCloseMeeting]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("หยุดแล้ว — พิมพ์คำถามใหม่ หรือกดสรุปมติ");
    const sid = meetingSessionIdRef.current;
    if (sid) {
      fetch(`/api/team-research/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-complete", reason: "🔒 ปิดประชุมโดยผู้ใช้" }),
      }).catch(() => {});
    }
  }, []);

  const clearSession = useCallback(() => {
    setRounds([]);
    setMeetingSessionId(null);
    meetingSessionIdRef.current = null;
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setCurrentSuggestions([]);
  }, []);

  const clearSessionStorage = useCallback((userId: string | null) => {
    if (userId) localStorage.removeItem(`${STORAGE_KEY_PREFIX}_${userId}`);
    clearSession();
  }, [clearSession]);

  return {
    running,
    agentTokens,
    status,
    chairmanId,
    searchingAgents,
    activeAgentIds,
    currentPhase,
    phase1DoneCount,
    isSynthesizing,
    clarificationQuestions,
    clarificationAnswers,
    pendingClarification,
    midMeetingQuestion,
    midMeetingAnswers,
    currentWebSources,
    meetingStartTime,
    elapsedTime,
    rounds,
    meetingSessionId,
    currentMessages,
    currentFinalAnswer,
    currentSuggestions,
    currentChartData,
    currentSynthMeta,
    isCurrentQA,
    isCurrentClosing,
    setClarificationAnswers,
    setRounds,
    setMeetingSessionId,
    meetingSessionIdRef,
    lastClarificationAnswersRef,
    handleRun,
    handleClarificationSubmit,
    handleSkipClarification,
    handleMidMeetingAnswer,
    handleSkipMidMeetingQuestion,
    handleCloseMeeting,
    handleSkipToSummary,
    handleStop,
    clearSession,
    clearSessionStorage,
  };
}
