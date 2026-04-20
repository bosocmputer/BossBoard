"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      const from = searchParams.get("from") || "/";
      window.location.href = from;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#04111f" }}>
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #00D4FF 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #0A2540 0%, #00D4FF 60%, transparent 100%)" }}
        />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#00D4FF 1px, transparent 1px), linear-gradient(90deg, #00D4FF 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo/TITLELOGO.png"
            alt="LEDGIO AI"
            className="w-auto object-contain drop-shadow-lg"
            style={{ height: "clamp(72px, 16vw, 110px)" }}
          />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black tracking-tight" style={{ color: "#ffffff" }}>LEDGIO</span>
              <span className="text-2xl font-black tracking-tight" style={{ color: "#00D4FF" }}>AI</span>
            </div>
            <p className="mt-1 text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "rgba(0,212,255,0.55)" }}>
              From Ledger to Intelligence
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-2xl p-7 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,212,255,0.15)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h2 className="text-center text-base font-semibold mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>
            เข้าสู่ระบบ
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="กรอกชื่อผู้ใช้"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  color: "rgba(255,255,255,0.9)",
                }}
                onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.08)"; }}
                onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  color: "rgba(255,255,255,0.9)",
                }}
                onFocus={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.08)"; }}
                onBlur={(e) => { e.target.style.border = "1px solid rgba(0,212,255,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <p className="text-xs rounded-xl px-4 py-2.5" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer mt-2"
              style={{
                background: loading ? "rgba(0,212,255,0.5)" : "linear-gradient(135deg, #00D4FF 0%, #0099bb 100%)",
                color: "#04111f",
                boxShadow: loading ? "none" : "0 4px 20px rgba(0,212,255,0.3)",
              }}
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2026 LEDGIO AI · AI Financial & Tax Advisor
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
