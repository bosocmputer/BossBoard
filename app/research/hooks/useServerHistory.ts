"use client";

import { useState, useCallback } from "react";
import type { ServerSession } from "../types";

export function useServerHistory() {
  const [serverSessions, setServerSessions] = useState<ServerSession[]>([]);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [viewingSession, setViewingSession] = useState<ServerSession | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<"all" | "completed" | "error" | "running">("all");

  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/team-research");
      const data = await res.json();
      const filtered = (data.sessions ?? []).filter((s: ServerSession) =>
        !s.agentIds?.some((id: string) => id.startsWith("system-")) &&
        (s.totalTokens > 0 || s.messages?.length > 0)
      );
      setTotalSessionCount(filtered.length);
      setServerSessions(filtered.slice(0, 20));
    } catch { /* ignore */ }
  }, []);

  const loadServerSession = useCallback(async (session: ServerSession) => {
    try {
      const res = await fetch(`/api/team-research/${session.id}`);
      const data = await res.json();
      if (data.session) {
        setViewingSession(data.session);
      }
    } catch { /* ignore */ }
  }, []);

  const clearViewingSession = useCallback(() => {
    setViewingSession(null);
  }, []);

  const filteredSessions = serverSessions.filter((s) => {
    const matchSearch = sessionSearch === "" || (s.question ?? "").toLowerCase().includes(sessionSearch.toLowerCase());
    const isRunning = s.status !== "completed" && s.status !== "error";
    const matchStatus =
      sessionStatusFilter === "all" ||
      (sessionStatusFilter === "completed" && s.status === "completed") ||
      (sessionStatusFilter === "error" && s.status === "error") ||
      (sessionStatusFilter === "running" && isRunning);
    return matchSearch && matchStatus;
  });

  return {
    serverSessions,
    filteredSessions,
    totalSessionCount,
    viewingSession,
    sessionSearch,
    sessionStatusFilter,
    setSessionSearch,
    setSessionStatusFilter,
    setViewingSession,
    fetchServerHistory,
    loadServerSession,
    clearViewingSession,
  };
}
