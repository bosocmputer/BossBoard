"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Edit3, Trash2, X, Check, Building2 } from "lucide-react";
import { showToast } from "../components/Toast";

interface ClientProfile {
  id: string;
  name: string;
  taxId?: string;
  businessType?: string;
  vatRegistered?: boolean;
  fiscalYearEnd?: string;
  accountingStandard?: "TFRS" | "NPAEs";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM: Omit<ClientProfile, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  taxId: "",
  businessType: "",
  vatRegistered: false,
  fiscalYearEnd: "31 ธันวาคม",
  accountingStandard: "NPAEs",
  notes: "",
};

export default function ClientsPage() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/client-profiles");
      if (res.ok) setProfiles(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProfiles(); }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: ClientProfile) {
    setForm({
      name: p.name,
      taxId: p.taxId ?? "",
      businessType: p.businessType ?? "",
      vatRegistered: p.vatRegistered ?? false,
      fiscalYearEnd: p.fiscalYearEnd ?? "31 ธันวาคม",
      accountingStandard: p.accountingStandard ?? "NPAEs",
      notes: p.notes ?? "",
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast("กรุณาใส่ชื่อลูกค้า", "error"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/client-profiles/${editingId}` : "/api/client-profiles";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(editingId ? "บันทึกแล้ว" : "เพิ่มลูกค้าแล้ว", "success");
      setShowForm(false);
      fetchProfiles();
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/client-profiles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      showToast("ลบแล้ว", "success");
      setDeleteConfirm(null);
      fetchProfiles();
    } catch (err) {
      showToast(String(err), "error");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase size={20} style={{ color: "var(--accent)" }} />
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>ลูกค้า</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>
              {profiles.length} รายการ
            </span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <Plus size={14} /> เพิ่มลูกค้า
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="border rounded-xl p-4 space-y-3" style={{ borderColor: "var(--accent)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                {editingId ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
              </span>
              <button onClick={() => setShowForm(false)}><X size={16} style={{ color: "var(--text-muted)" }} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>ชื่อลูกค้า / บริษัท *</label>
                <input
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
                <input
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  value={form.taxId}
                  onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))}
                  placeholder="0105560123456"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>ประเภทนิติบุคคล</label>
                <select
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  value={form.businessType}
                  onChange={(e) => setForm(f => ({ ...f, businessType: e.target.value }))}
                >
                  <option value="">-- เลือก --</option>
                  <option value="บริษัทจำกัด">บริษัทจำกัด</option>
                  <option value="บริษัทมหาชนจำกัด">บริษัทมหาชนจำกัด</option>
                  <option value="ห้างหุ้นส่วนจำกัด">ห้างหุ้นส่วนจำกัด</option>
                  <option value="ห้างหุ้นส่วนสามัญนิติบุคคล">ห้างหุ้นส่วนสามัญนิติบุคคล</option>
                  <option value="ร้านค้าบุคคลธรรมดา">ร้านค้าบุคคลธรรมดา</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>มาตรฐานบัญชี</label>
                <select
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  value={form.accountingStandard}
                  onChange={(e) => setForm(f => ({ ...f, accountingStandard: e.target.value as "TFRS" | "NPAEs" }))}
                >
                  <option value="NPAEs">NPAEs (กิจการไม่มีส่วนได้เสียสาธารณะ)</option>
                  <option value="TFRS">TFRS (กิจการมีส่วนได้เสียสาธารณะ/จดทะเบียน SET)</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>วันสิ้นรอบบัญชี</label>
                <select
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  value={form.fiscalYearEnd}
                  onChange={(e) => setForm(f => ({ ...f, fiscalYearEnd: e.target.value }))}
                >
                  <option value="31 ธันวาคม">31 ธันวาคม</option>
                  <option value="31 มีนาคม">31 มีนาคม</option>
                  <option value="30 มิถุนายน">30 มิถุนายน</option>
                  <option value="30 กันยายน">30 กันยายน</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="vatReg"
                  checked={form.vatRegistered}
                  onChange={(e) => setForm(f => ({ ...f, vatRegistered: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="vatReg" className="text-sm cursor-pointer" style={{ color: "var(--text)" }}>จดทะเบียน VAT</label>
              </div>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>หมายเหตุ</label>
              <textarea
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="ข้อมูลเพิ่มเติม..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                style={{ background: "var(--accent)", color: "#000", opacity: saving ? 0.6 : 1 }}
              >
                <Check size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>กำลังโหลด...</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Building2 size={32} className="mx-auto" style={{ color: "var(--text-muted)" }} />
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีลูกค้า — กด &quot;เพิ่มลูกค้า&quot; เพื่อเริ่มต้น</div>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="border rounded-xl p-4 flex items-start justify-between gap-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{p.name}</span>
                    {p.vatRegistered && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>VAT</span>
                    )}
                    {p.accountingStandard && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{p.accountingStandard}</span>
                    )}
                  </div>
                  <div className="text-xs mt-1 space-x-3" style={{ color: "var(--text-muted)" }}>
                    {p.taxId && <span>🪪 {p.taxId}</span>}
                    {p.businessType && <span>{p.businessType}</span>}
                    {p.fiscalYearEnd && <span>📅 สิ้นปี {p.fiscalYearEnd}</span>}
                  </div>
                  {p.notes && (
                    <div className="text-xs mt-1 line-clamp-1" style={{ color: "var(--text-muted)" }}>{p.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg)]"
                    title="แก้ไข"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Edit3 size={14} />
                  </button>
                  {deleteConfirm === p.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: "var(--danger)" }}>ยืนยัน?</span>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: "var(--danger)", color: "#fff" }}
                      >ลบ</button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 rounded-lg border"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >ยกเลิก</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg)]"
                      title="ลบ"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
