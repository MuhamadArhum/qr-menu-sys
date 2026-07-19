"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Overview {
  restaurants: number;
  branches: number;
  tables: number;
  totalQRScans: number;
  activeSubscriptions: number;
}

interface Restaurant {
  id: string;
  displayName: string;
  legalName: string;
  status: string;
  createdAt: string;
}

interface RestaurantsResponse {
  data: Restaurant[];
  total: number;
}

interface Subscription {
  id: string;
  restaurantId: string;
  status: string;
  endDate: string;
  restaurant: { displayName: string };
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { email: string } | null;
}
interface AuditResponse {
  data: AuditEntry[];
  total: number;
}

const STATS = [
  {
    key: "restaurants" as const,
    label: "Restaurants",
    color: "var(--chili)",
    bg: "var(--chili-10)",
    accentColor: "#ff4630",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
      </svg>
    ),
  },
  {
    key: "branches" as const,
    label: "Branches",
    color: "#3B82F6",
    bg: "#3b82f61a",
    accentColor: "#3B82F6",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
  {
    key: "tables" as const,
    label: "Tables",
    color: "var(--mango)",
    bg: "rgba(255,169,48,0.12)",
    accentColor: "#ffa930",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5h18M3 12h18M6 7.5V18m12-10.5V18" />
      </svg>
    ),
  },
  {
    key: "totalQRScans" as const,
    label: "QR Scans",
    color: "var(--lime)",
    bg: "rgba(143,163,0,0.12)",
    accentColor: "#8fa300",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="0.5" /><rect x="16" y="3" width="5" height="5" rx="0.5" />
        <rect x="3" y="16" width="5" height="5" rx="0.5" /><path d="M21 21h.01M13 3v5h5M13 13h5v5M13 13H3M21 13v.01" />
      </svg>
    ),
  },
  {
    key: "activeSubscriptions" as const,
    label: "Active Subs",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    accentColor: "#8B5CF6",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
      </svg>
    ),
  },
];

const QUICK_ACTIONS = [
  {
    label: "Add Restaurant",
    href: "/restaurants",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: "Manage Plans",
    href: "/plans",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
      </svg>
    ),
  },
  {
    label: "View Subscriptions",
    href: "/subscriptions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" /><path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
  {
    label: "View Audit Log",
    href: "/audit",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "rgba(143,163,0,0.12)",  color: "var(--lime)"    },
    INACTIVE:  { bg: "var(--char-08)",         color: "var(--char-60)" },
    SUSPENDED: { bg: "var(--chili-10)",        color: "var(--chili)"   },
    PENDING:   { bg: "rgba(255,169,48,0.12)", color: "var(--mango)"   },
  };
  const s = map[status] ?? { bg: "var(--char-08)", color: "var(--char-60)" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color, fontFamily: "Space Grotesk, sans-serif" }}
    >
      {status}
    </span>
  );
}

// Decorative dots grid for hero banner
function DecorativeDotsGrid() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ opacity: 0.10 }}>
      {Array.from({ length: 4 }).map((_, ri) =>
        Array.from({ length: 4 }).map((_, ci) => (
          <circle
            key={`${ri}-${ci}`}
            cx={ci * 28 + 14}
            cy={ri * 28 + 14}
            r="5"
            fill="white"
          />
        ))
      )}
    </svg>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => api.get<Overview>("/analytics/overview"),
  });

  const { data: recentRes, isLoading: recentLoading } = useQuery({
    queryKey: ["recent-restaurants"],
    queryFn: () => api.get<RestaurantsResponse>("/restaurants?page=1&limit=5"),
  });

  const { data: allSubs } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.get<Subscription[]>("/subscriptions"),
  });

  const { data: auditLog } = useQuery({
    queryKey: ["audit", "recent"],
    queryFn: () => api.get<AuditResponse>("/audit?page=1&limit=6"),
  });

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringSoon = (allSubs ?? [])
    .filter(s => {
      if (s.status !== "ACTIVE") return false;
      const end = new Date(s.endDate);
      return end <= thirtyDaysFromNow && end >= new Date();
    })
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Section 1: Hero Banner ─────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1c1710 0%, #2d2318 60%, #3d2f1e 100%)" }}
      >
        {/* Decorative pattern — top right */}
        <div className="absolute top-6 right-8 pointer-events-none select-none">
          <DecorativeDotsGrid />
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
              Super Admin
            </span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(255,247,234,0.10)", color: "rgba(255,247,234,0.75)", border: "1px solid rgba(255,247,234,0.15)" }}
            >
              Abyte Menu
            </span>
          </div>

          <h1
            className="text-3xl font-black leading-tight mb-2"
            style={{ fontFamily: "Space Grotesk, sans-serif", color: "#ffffff" }}
          >
            Platform Overview
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Work Sans, sans-serif" }}>
            Abyte Menu · Super Admin &nbsp;·&nbsp; {today}
          </p>
        </div>
      </div>

      {/* ── Section 2: KPI Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATS.map(({ key, label, color, bg, accentColor, icon }) => (
          <div
            key={key}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}
          >
            <div className="p-5 flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, color }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                {overviewLoading ? (
                  <div
                    className="h-8 w-14 rounded-lg animate-pulse mb-1"
                    style={{ background: "var(--char-08)" }}
                  />
                ) : (
                  <div
                    className="text-3xl font-black leading-none"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}
                  >
                    {overview?.[key] !== undefined ? overview[key].toLocaleString() : "—"}
                  </div>
                )}
                <div className="text-xs mt-1.5 font-medium" style={{ color: "var(--char-60)" }}>{label}</div>
              </div>
            </div>
            {/* Accent bar */}
            <div className="h-[3px] w-full" style={{ background: accentColor }} />
          </div>
        ))}
      </div>

      {/* ── This Month Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Tenants",
            value: overview?.restaurants?.toLocaleString() ?? "—",
            sub: "registered restaurants",
            color: "var(--chili)",
            bg: "var(--chili-10)",
            borderColor: "rgba(255,70,48,0.13)",
          },
          {
            label: "Platform QR Scans",
            value: overview?.totalQRScans?.toLocaleString() ?? "—",
            sub: "total scans all time",
            color: "var(--lime)",
            bg: "rgba(143,163,0,0.10)",
            borderColor: "rgba(143,163,0,0.13)",
          },
          {
            label: "Active Subscriptions",
            value: overview?.activeSubscriptions?.toLocaleString() ?? "—",
            sub: `of ${overview?.restaurants ?? "—"} total restaurants`,
            color: "#8B5CF6",
            bg: "rgba(139,92,246,0.10)",
            borderColor: "rgba(139,92,246,0.13)",
          },
        ].map(({ label, value, sub, color, bg, borderColor }) => (
          <div key={label} className="rounded-2xl p-6 relative overflow-hidden" style={{ background: bg, border: `1.5px solid ${borderColor}` }}>
            <p className="text-4xl font-black mb-1" style={{ fontFamily: "JetBrains Mono, monospace", color }}>
              {overviewLoading ? (
                <span className="inline-block h-10 w-20 rounded-lg animate-pulse" style={{ background: color + "33" }} />
              ) : value}
            </p>
            <p className="text-sm font-bold" style={{ color, fontFamily: "Space Grotesk, sans-serif" }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Section 3: 2-column layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left col — Recent Restaurants */}
        <div
          className="lg:col-span-3 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: "var(--char-15)" }}
          >
            <div>
              <h2
                className="font-black text-base"
                style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}
              >
                Recent Restaurants
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>
                Newest tenants on the platform
              </p>
            </div>
            <Link
              href="/restaurants"
              className="text-xs font-bold transition-opacity hover:opacity-70"
              style={{ color: "var(--chili)" }}
            >
              View all →
            </Link>
          </div>

          {/* Restaurant rows */}
          {recentLoading ? (
            <div className="divide-y" style={{ borderColor: "var(--char-08)" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded animate-pulse" style={{ background: "var(--char-08)", width: "55%" }} />
                    <div className="h-3 rounded animate-pulse" style={{ background: "var(--char-08)", width: "40%" }} />
                  </div>
                  <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: "var(--char-08)" }} />
                  <div className="h-3 w-20 rounded animate-pulse" style={{ background: "var(--char-08)" }} />
                </div>
              ))}
            </div>
          ) : recentRes?.data.length ? (
            <div className="divide-y" style={{ borderColor: "var(--char-08)" }}>
              {recentRes.data.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
                    >
                      {r.displayName}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--char-60)" }}>{r.legalName}</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span
                    className="text-xs shrink-0"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}
                  >
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="text-xs font-bold shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: "var(--chili)" }}
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--char-08)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--char-30)" }}>
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--char-60)" }}>No restaurants yet</p>
            </div>
          )}
        </div>

        {/* Right col — Expiring Subscriptions */}
        <div className="lg:col-span-2">
          {expiringSoon.length > 0 ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--paper)", border: "1.5px solid rgba(255,169,48,0.30)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,169,48,0.20)", background: "rgba(255,169,48,0.05)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--mango)" }}
                  />
                  <h2
                    className="font-black text-base"
                    style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}
                  >
                    Expiring Soon
                  </h2>
                  <span className="text-xs" style={{ color: "var(--char-60)" }}>within 30 days</span>
                </div>
                <Link
                  href="/subscriptions"
                  className="text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: "var(--mango)" }}
                >
                  Manage →
                </Link>
              </div>
              <ul className="divide-y" style={{ borderColor: "var(--char-08)" }}>
                {expiringSoon.map(s => {
                  const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000);
                  const urgent = daysLeft <= 7;
                  const urgencyColor = urgent ? "var(--chili)" : daysLeft <= 14 ? "var(--mango)" : "var(--char-60)";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-5 py-4 transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
                        >
                          {s.restaurant?.displayName ?? s.restaurantId}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>
                          Expires{" "}
                          {new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" "}
                          <span className="font-bold" style={{ color: urgencyColor }}>
                            · {daysLeft}d left
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/restaurants/${s.restaurantId}`}
                        className="ml-3 text-xs font-bold shrink-0 transition-opacity hover:opacity-70"
                        style={{ color: urgent ? "var(--chili)" : "var(--mango)" }}
                      >
                        Renew →
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            /* All healthy state */
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[200px]"
              style={{ background: "rgba(143,163,0,0.07)", border: "1.5px solid rgba(143,163,0,0.25)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(143,163,0,0.18)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--lime)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  All subscriptions healthy
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>
                  No subscriptions expiring in the next 30 days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Quick Actions ───────────────────────────────── */}
      <div>
        <h2
          className="text-sm font-black mb-3 tracking-wide"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl p-5 flex items-center gap-4 transition-all"
              style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)", textDecoration: "none" }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--chili)";
                e.currentTarget.style.background = "rgba(255,70,48,0.03)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--char-15)";
                e.currentTarget.style.background = "var(--paper)";
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--char-08)", color: "var(--chili)" }}
              >
                {icon}
              </div>
              <span
                className="flex-1 text-sm font-semibold leading-tight"
                style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
              >
                {label}
              </span>
              <span style={{ color: "var(--char-30)", fontSize: "16px" }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {auditLog?.data && auditLog.data.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--char-15)" }}>
            <div>
              <h2 className="font-black text-base" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Recent Activity</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Latest platform actions</p>
            </div>
            <Link href="/audit" className="text-xs font-bold" style={{ color: "var(--chili)" }}>View all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--char-08)" }}>
            {auditLog.data.map((entry) => {
              const actionColors: Record<string, string> = {
                CREATE: "var(--lime)", UPDATE: "#3B82F6", DELETE: "var(--chili)",
                APPROVE: "var(--lime)", SUSPEND: "var(--mango)", ACTIVATE: "var(--lime)",
              };
              const color = actionColors[entry.action] ?? "var(--char-60)";
              return (
                <div key={entry.id} className="flex items-center gap-4 px-6 py-3.5"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                      <span style={{ color }}>{entry.action}</span>
                      {" "}{entry.entityType.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--char-60)" }}>
                      {entry.actor?.email ?? "System"} · {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-30)" }}>
                    {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
