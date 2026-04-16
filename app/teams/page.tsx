"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, UsersRound, FlaskConical } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  active: boolean;
}

interface Team {
  id: string;
  name: string;
  emoji: string;
  description: string;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = { name: "", emoji: "👥", description: "", agentIds: [] as string[] };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, ar] = await Promise.all([
        fetch("/api/teams").then((r) => r.json()),
        fetch("/api/team-agents").then((r) => r.json()),
      ]);
      setTeams(tr.teams ?? []);
      setAgents((ar.agents ?? []).filter((a: Agent) => a.active));
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditTarget(team);
    setForm({ name: team.name, emoji: team.emoji, description: team.description, agentIds: [...team.agentIds] });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditTarget(null);
  };

  const toggleAgent = (id: string) => {
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.includes(id) ? f.agentIds.filter((x) => x !== id) : [...f.agentIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("กรุณาใส่ชื่อ Team"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editTarget ? `/api/teams/${editTarget.id}` : "/api/teams";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "บันทึกไม่สำเร็จ");
      }
      await fetchAll();
      setShowModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      await fetchAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const agentById = (id: string) => agents.find((a) => a.id === id);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
            Teams
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>จัดกลุ่ม agents เพื่อใช้งานใน Research ร่วมกัน</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          + สร้าง Team
        </button>
      </div>

      {/* Error banner */}
      {error && !showModal && (
        <div className="border border-red-500/40 bg-red-500/10 rounded-lg px-4 py-2 text-sm text-red-400 mb-4">
          {error}
          <button className="ml-3 opacity-60 hover:opacity-100" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>
      )}

      {/* Empty state */}
      {!loading && teams.length === 0 && (
        <div className="border rounded-xl p-12 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <UsersRound size={36} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p>ยังไม่มี Team — กด &ldquo;สร้าง Team&rdquo; เพื่อเริ่มต้น</p>
        </div>
      )}

      {/* Team cards */}
      {!loading && teams.length > 0 && (
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 transition-all"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {/* Emoji */}
              <div className="text-3xl">{team.emoji}</div>

              {/* Content */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold" style={{ color: "var(--text)" }}>{team.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    {team.agentIds.length} agents
                  </span>
                </div>
                {team.description && (
                  <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {team.description}
                  </div>
                )}

                {/* Agent pills */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {team.agentIds.length === 0 && (
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>ยังไม่มี agent</span>
                  )}
                  {team.agentIds.map((aid) => {
                    const a = agentById(aid);
                    return a ? (
                      <span
                        key={aid}
                        className="text-[11px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        <span>{a.emoji}</span>
                        <span>{a.name}</span>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">
                <Link
                  href={`/research?teamId=${team.id}`}
                  className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  Research
                </Link>
                <button
                  onClick={() => openEdit(team)}
                  className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  แก้ไข
                </button>
                {deleteConfirm === team.id ? (
                  <>
                    <button onClick={() => handleDelete(team.id)} className="px-3 py-2 sm:py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">ยืนยัน</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 sm:py-1 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ยกเลิก</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(team.id)} className="px-3 py-2 sm:py-1 rounded text-xs border border-red-500/30 text-red-400">ลบ</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div
            className="w-full sm:max-w-lg border rounded-t-xl sm:rounded-xl flex flex-col gap-0 overflow-hidden max-h-[85vh]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{editTarget ? "แก้ไข Team" : "สร้าง Team ใหม่"}</span>
              <button onClick={closeModal} className="opacity-50 hover:opacity-100 text-lg leading-none">✕</button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 overflow-y-auto">
              {error && (
                <div className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
              )}

              {/* Emoji + Name row */}
              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    title="Team emoji"
                    placeholder="👥"
                    className="w-14 border rounded-lg px-2 py-2 text-center text-lg bg-transparent focus:outline-none focus:border-[var(--accent)]"
                    style={{ borderColor: "var(--border)" }}
                    maxLength={4}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>ชื่อ Team *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น Research A-Team"
                    className="border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)] text-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>คำอธิบาย (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="อธิบายวัตถุประสงค์ของ team นี้…"
                  className="border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)] text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              {/* Agent selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>เลือก Agents ({form.agentIds.length} เลือก)</label>
                {agents.length === 0 ? (
                  <p className="text-xs opacity-40 py-2">ไม่มี active agent — ไปที่{" "}
                    <Link href="/agents" className="underline" style={{ color: "var(--accent)" }}>Agents</Link>{" "}
                    เพื่อเพิ่ม agent ก่อน
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border rounded-lg p-2" style={{ borderColor: "var(--border)" }}>
                    {agents.map((agent) => {
                      const selected = form.agentIds.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => toggleAgent(agent.id)}
                          className="flex items-center gap-2 px-2 py-2 text-left text-sm transition-colors rounded-lg"
                          style={{
                            background: selected ? "var(--accent-15)" : "transparent",
                            color: selected ? "var(--accent)" : "var(--text)",
                          }}
                        >
                          <span className="w-4 text-center flex-shrink-0">{selected ? "✓" : ""}</span>
                          <span className="flex-shrink-0">{agent.emoji}</span>
                          <span className="font-medium truncate">{agent.name}</span>
                          <span className="text-xs ml-auto flex-shrink-0 hidden sm:inline" style={{ color: "var(--text-muted)" }}>{agent.role}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg font-bold disabled:opacity-40 transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {saving ? "กำลังบันทึก…" : editTarget ? "บันทึก" : "สร้าง Team"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
