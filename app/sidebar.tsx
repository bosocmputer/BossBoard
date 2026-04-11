"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { ThemeSwitcher } from "@/lib/theme";

type NavIconName = "agents" | "pixelOffice" | "models" | "sessions" | "stats" | "alerts" | "skills" | "teamAgents" | "research" | "teams" | "meetingRoom";
type PixelTone = "base" | "shade" | "light";
type PixelRect = { x: number; y: number; w?: number; h?: number; tone?: PixelTone; opacity?: number };
type PixelPalette = { base: string; shade: string; light: string };

function PixelSvg({ pixels, className, palette }: { pixels: PixelRect[]; className?: string; palette: PixelPalette }) {
  const fillForTone = (tone: PixelTone = "base") => {
    if (tone === "shade") return palette.shade;
    if (tone === "light") return palette.light;
    return palette.base;
  };

  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      style={{ imageRendering: "pixelated", shapeRendering: "crispEdges" }}
    >
      {pixels.map((pixel, index) => (
        <rect
          key={index}
          x={pixel.x}
          y={pixel.y}
          width={pixel.w ?? 1}
          height={pixel.h ?? 1}
          fill={fillForTone(pixel.tone)}
          opacity={pixel.opacity ?? 1}
        />
      ))}
    </svg>
  );
}

function navPalette(active: boolean): PixelPalette {
  return active
    ? { base: "var(--accent)", shade: "color-mix(in srgb, var(--accent) 72%, black)", light: "color-mix(in srgb, var(--accent) 55%, white)" }
    : { base: "var(--text)", shade: "color-mix(in srgb, var(--text) 62%, black)", light: "color-mix(in srgb, var(--text) 35%, white)" };
}

function NavPixelIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const baseClass = "h-4 w-4";
  const palette = navPalette(active);

  switch (name) {
    case "agents":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 5, y: 1, w: 6, h: 1, tone: "light" },
            { x: 4, y: 2, w: 8, h: 1, tone: "base" },
            { x: 3, y: 3, w: 10, h: 2, tone: "base" },
            { x: 4, y: 5, w: 8, h: 1, tone: "shade" },
            { x: 2, y: 7, w: 12, h: 1, tone: "base" },
            { x: 1, y: 8, w: 3, h: 5, tone: "shade" },
            { x: 6, y: 8, w: 4, h: 2, tone: "light", opacity: 0.95 },
            { x: 12, y: 8, w: 3, h: 5, tone: "shade" },
            { x: 5, y: 10, w: 6, h: 4, tone: "base" },
            { x: 6, y: 6, w: 1, h: 1, tone: "light", opacity: 0.65 },
            { x: 9, y: 6, w: 1, h: 1, tone: "light", opacity: 0.65 },
          ]}
        />
      );
    case "pixelOffice":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 1, y: 4, w: 14, h: 1, tone: "shade" },
            { x: 1, y: 5, w: 2, h: 8, tone: "base" },
            { x: 13, y: 5, w: 2, h: 8, tone: "base" },
            { x: 5, y: 1, w: 6, h: 2, tone: "light" },
            { x: 4, y: 3, w: 8, h: 1, tone: "base" },
            { x: 4, y: 7, w: 3, h: 3, tone: "shade" },
            { x: 9, y: 7, w: 3, h: 3, tone: "shade" },
            { x: 6, y: 10, w: 4, h: 3, tone: "light", opacity: 0.9 },
          ]}
        />
      );
    case "models":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 5, y: 1, w: 6, h: 1, tone: "light" },
            { x: 3, y: 3, w: 10, h: 1, tone: "base" },
            { x: 2, y: 5, w: 12, h: 1, tone: "shade" },
            { x: 3, y: 7, w: 10, h: 1, tone: "base" },
            { x: 5, y: 9, w: 6, h: 1, tone: "light" },
            { x: 4, y: 2, w: 1, h: 1, tone: "light", opacity: 0.8 },
            { x: 11, y: 2, w: 1, h: 1, tone: "light", opacity: 0.8 },
            { x: 1, y: 4, w: 1, h: 2, tone: "shade", opacity: 0.9 },
            { x: 14, y: 4, w: 1, h: 2, tone: "shade", opacity: 0.9 },
            { x: 4, y: 11, w: 1, h: 2, tone: "shade", opacity: 0.9 },
            { x: 11, y: 11, w: 1, h: 2, tone: "shade", opacity: 0.9 },
            { x: 6, y: 13, w: 4, h: 1, tone: "base" },
          ]}
        />
      );
    case "sessions":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 2, y: 3, w: 10, h: 7, tone: "base" },
            { x: 4, y: 10, w: 4, h: 2, tone: "shade" },
            { x: 10, y: 10, w: 2, h: 2, tone: "shade" },
            { x: 4, y: 5, w: 6, h: 1, tone: "light", opacity: 0.6 },
            { x: 4, y: 7, w: 4, h: 1, tone: "light", opacity: 0.6 },
            { x: 11, y: 6, w: 3, h: 5, tone: "shade", opacity: 0.9 },
            { x: 12, y: 5, w: 2, h: 1, tone: "light", opacity: 0.85 },
          ]}
        />
      );
    case "stats":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 2, y: 12, w: 12, h: 1, tone: "shade", opacity: 0.7 },
            { x: 3, y: 9, w: 2, h: 3, tone: "base" },
            { x: 7, y: 6, w: 2, h: 6, tone: "base" },
            { x: 11, y: 3, w: 2, h: 9, tone: "light" },
            { x: 2, y: 4, w: 2, h: 2, tone: "shade", opacity: 0.65 },
            { x: 5, y: 2, w: 2, h: 2, tone: "light", opacity: 0.65 },
          ]}
        />
      );
    case "alerts":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 7, y: 1, w: 2, h: 1, tone: "light" },
            { x: 5, y: 2, w: 6, h: 1, tone: "base" },
            { x: 4, y: 3, w: 8, h: 1, tone: "base" },
            { x: 4, y: 4, w: 8, h: 5, tone: "shade" },
            { x: 3, y: 9, w: 10, h: 2, tone: "base" },
            { x: 6, y: 12, w: 4, h: 1, tone: "light" },
            { x: 5, y: 13, w: 6, h: 1, tone: "shade", opacity: 0.8 },
          ]}
        />
      );
    case "skills":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 6, y: 1, w: 4, h: 2, tone: "light" },
            { x: 4, y: 3, w: 8, h: 2, tone: "base" },
            { x: 2, y: 5, w: 12, h: 6, tone: "shade" },
            { x: 4, y: 11, w: 8, h: 2, tone: "base" },
            { x: 6, y: 13, w: 4, h: 2, tone: "light" },
            { x: 7, y: 6, w: 2, h: 4, tone: "base", opacity: 0.5 },
            { x: 5, y: 7, w: 6, h: 2, tone: "light", opacity: 0.45 },
          ]}
        />
      );
    case "teamAgents":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 2, y: 2, w: 4, h: 4, tone: "base" },
            { x: 10, y: 2, w: 4, h: 4, tone: "base" },
            { x: 6, y: 1, w: 4, h: 4, tone: "light" },
            { x: 1, y: 7, w: 6, h: 5, tone: "shade" },
            { x: 9, y: 7, w: 6, h: 5, tone: "shade" },
            { x: 5, y: 6, w: 6, h: 5, tone: "base" },
            { x: 7, y: 3, w: 2, h: 2, tone: "light", opacity: 0.6 },
          ]}
        />
      );
    case "research":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 2, y: 2, w: 10, h: 1, tone: "light" },
            { x: 2, y: 4, w: 8, h: 1, tone: "base" },
            { x: 2, y: 6, w: 10, h: 1, tone: "base" },
            { x: 2, y: 8, w: 6, h: 1, tone: "shade" },
            { x: 10, y: 9, w: 4, h: 4, tone: "base" },
            { x: 9, y: 13, w: 6, h: 1, tone: "shade" },
            { x: 12, y: 8, w: 2, h: 2, tone: "light", opacity: 0.7 },
          ]}
        />
      );
    case "teams":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            { x: 1, y: 2, w: 4, h: 4, tone: "shade" },
            { x: 6, y: 1, w: 4, h: 4, tone: "light" },
            { x: 11, y: 2, w: 4, h: 4, tone: "shade" },
            { x: 0, y: 7, w: 5, h: 4, tone: "shade", opacity: 0.85 },
            { x: 5, y: 6, w: 6, h: 4, tone: "base" },
            { x: 11, y: 7, w: 5, h: 4, tone: "shade", opacity: 0.85 },
            { x: 7, y: 2, w: 2, h: 2, tone: "light", opacity: 0.55 },
          ]}
        />
      );
    case "meetingRoom":
      return (
        <PixelSvg
          className={baseClass}
          palette={palette}
          pixels={[
            // table
            { x: 3, y: 5, w: 10, h: 6, tone: "shade" },
            { x: 4, y: 6, w: 8, h: 4, tone: "base" },
            // chairs top
            { x: 2, y: 2, w: 2, h: 2, tone: "light" },
            { x: 6, y: 2, w: 2, h: 2, tone: "light" },
            { x: 10, y: 2, w: 2, h: 2, tone: "light" },
            // chairs bottom
            { x: 2, y: 12, w: 2, h: 2, tone: "light" },
            { x: 6, y: 12, w: 2, h: 2, tone: "light" },
            { x: 10, y: 12, w: 2, h: 2, tone: "light" },
          ]}
        />
      );
  }
}

function NavItemIcon({ name, active }: { name: NavIconName; active: boolean }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center border transition-colors ${
        active
          ? "border-[var(--accent)]/45 bg-[var(--accent)]/14"
          : "border-[var(--border)] bg-[var(--bg)]/88"
      }`}
      style={{
        borderRadius: 0,
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)"
          : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.1)",
      }}
    >
      <NavPixelIcon name={name} active={active} />
    </span>
  );
}

const NAV_ITEMS: { group: string; items: { href: string; icon: NavIconName; labelKey: string }[] }[] = [
  {
    group: "Team",
    items: [
      { href: "/agents", icon: "teamAgents", labelKey: "nav.teamAgents" },
      { href: "/teams", icon: "teams", labelKey: "nav.teams" },
      { href: "/research", icon: "research", labelKey: "nav.research" },
      { href: "/mock-trial", icon: "agents", labelKey: "nav.mockTrial" },
    ],
  },
  {
    group: "nav.config",
    items: [
      { href: "/settings", icon: "skills", labelKey: "nav.settings" },
      { href: "/benefits", icon: "stats", labelKey: "nav.benefits" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAgentCount, setMobileAgentCount] = useState<number | null>(null);
  const [mobileOpenclawVersion, setMobileOpenclawVersion] = useState<string | null>(null);

  const logoTransform = "none";
  const mobileLogoTransform = "none";
  const logoCursor = "default";
  const handleLogoMouseDown = () => {};
  const handleLogoClickCapture = () => {};
  const handleLogoNativeDragStart = (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); };
  const mobileCurrent = NAV_ITEMS.flatMap((g) => g.items).find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/")
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let aborted = false;
    const fetchAgentCount = async () => {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        const count = Array.isArray(data?.agents) ? data.agents.length : 0;
        setMobileAgentCount(count);
      } catch {}
    };
    if (pathname === "/") {
      void fetchAgentCount();
      const timer = setInterval(fetchAgentCount, 30000);
      return () => {
        aborted = true;
        clearInterval(timer);
      };
    }
    return () => {
      aborted = true;
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const fetchOpenclawVersion = async () => {
      try {
        const res = await fetch("/api/gateway-health", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const version = typeof data?.openclawVersion === "string" ? data.openclawVersion.trim() : "";
        setMobileOpenclawVersion(version || null);
      } catch {}
    };
    void fetchOpenclawVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="md:hidden">
        <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
          <div className="h-full px-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-base"
              aria-label="Open menu"
            >
              ☰
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 min-w-0"
              onClickCapture={handleLogoClickCapture}
              onDragStart={handleLogoNativeDragStart}
              draggable={false}
            >
              <span
                className="relative inline-block leading-none transition-opacity duration-300"
                data-openclaw-logo-anchor="true"
                onDragStart={handleLogoNativeDragStart}
                draggable={false}
                style={{
                  fontSize: "1.875rem",
                  transform: mobileLogoTransform,
                  transformOrigin: "50% 50%",
                  opacity: 1,
                }}
              >
                🏛️
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold tracking-wide truncate">
                  BOSSBOARD
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  {pathname === "/" && mobileAgentCount !== null
                    ? `${mobileAgentCount} ${t("home.agentCount")}`
                    : mobileCurrent ? t(mobileCurrent.labelKey) : "ห้องประชุม AI"}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[55]">
            <button
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu overlay"
            />
            <aside className="absolute top-0 left-0 bottom-0 w-[276px] max-w-[86vw] border-r border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col">
              <div className="h-14 px-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-semibold text-sm">Navigation</div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-4">
                  {NAV_ITEMS.map((group) => (
                    <div key={group.group}>
                      <div className="px-1 mb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {t(group.group)}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                                active
                                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                              }`}
                            >
                              <NavItemIcon name={item.icon} active={active} />
                              {t(item.labelKey)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>
            </aside>
          </div>
        )}
      </div>

      <aside
        className="sidebar hidden md:flex"
        style={{ width: collapsed ? 64 : 224 }}
      >
        {/* Header: Logo + Toggle */}
        <div className="border-b border-[var(--border)]" style={{ padding: collapsed ? "16px 0" : "16px 20px" }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link href="/" onClickCapture={handleLogoClickCapture} onDragStart={handleLogoNativeDragStart} draggable={false}>
                <span
                  className="relative inline-block transition-opacity duration-300"
                  onMouseDown={handleLogoMouseDown}
                  onDragStart={handleLogoNativeDragStart}
                  draggable={false}
                  style={{
                    fontSize: "4.219rem",
                    lineHeight: 1,
                    transform: logoTransform,
                    opacity: 1,
                    cursor: logoCursor,
                  }}
                >
                  🏛️
                </span>
              </Link>
              <button
                onClick={() => setCollapsed(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-lg"
                title={t("nav.expandSidebar")}
              >
                »
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                  onClickCapture={handleLogoClickCapture}
                  onDragStart={handleLogoNativeDragStart}
                  draggable={false}
                >
                  <span
                    className="relative inline-block transition-opacity duration-300"
                    onMouseDown={handleLogoMouseDown}
                    onDragStart={handleLogoNativeDragStart}
                    draggable={false}
                    style={{
                      fontSize: "4.219rem",
                      lineHeight: 1,
                      transform: logoTransform,
                      opacity: 1,
                      cursor: logoCursor,
                    }}
                  >
                    🏛️
                  </span>
                  <div>
                    <div className="text-sm font-bold text-[var(--text)] tracking-wide">BOSSBOARD</div>
                    <div className="text-[10px] text-[var(--text-muted)] tracking-wider">ห้องประชุม AI</div>
                  </div>
                </Link>
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-lg"
                  title={t("nav.collapseSidebar")}
                >
                  «
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-8">
                <LanguageSwitcher />
                <ThemeSwitcher />
              </div>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav className="sidebar-nav" style={{ padding: collapsed ? "16px 8px" : "16px 12px" }}>
          <div className="space-y-5">
            {NAV_ITEMS.map((group) => (
              <div key={group.group}>
                {!collapsed && (
                  <div className="px-2 mb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
                    {t(group.group)}
                    <span className="text-[var(--text-muted)] opacity-40">—</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? t(item.labelKey) : undefined}
                        className={`flex items-center rounded-lg text-sm transition-colors ${
                          active
                            ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                            : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                        }`}
                        style={{
                          padding: collapsed ? "8px 0" : "8px 12px",
                          justifyContent: collapsed ? "center" : "flex-start",
                          gap: collapsed ? 0 : 10,
                        }}
                      >
                        <NavItemIcon name={item.icon} active={active} />
                        {!collapsed && t(item.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Spacer */}
      <div className="hidden md:block" style={{ width: collapsed ? 64 : 224, flexShrink: 0, transition: "width 0.2s" }} />
    </>
  );
}
