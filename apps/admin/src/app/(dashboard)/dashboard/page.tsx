"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import React from "react";

interface MenuSummary {
  categories: number;
  menuItems: number;
  variantGroups: number;
  addonGroups: number;
  availability: { status: string; count: number }[];
}

interface QRStats {
  totalScans: number;
  byTable: { tableId: string; label: string; branchName: string; count: number }[];
  daily: { day: string; count: number }[];
}

interface Restaurant { name: string }

interface MySubscription {
  status: string;
  startDate: string;
  endDate: string;
  plan: { name: string; billingCycle: string; price: string; featureLimits: Record<string, number> | null };
}

interface Order {
  id: string;
  tableLabel: string;
  status: string;
  createdAt: string;
  totalAmount?: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const CategoryIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const MenuIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const CheckIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const QRIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="5" rx="0.5" /><rect x="16" y="3" width="5" height="5" rx="0.5" />
    <rect x="3" y="16" width="5" height="5" rx="0.5" />
    <path d="M21 21h.01M13 3v5h5M13 13h5v5M13 13H3M21 13v.01" />
  </svg>
);

const PlusCircleIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
  </svg>
);

const MapPinIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
  </svg>
);

const ReceiptIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" /><path d="M8 7h8M8 11h8M8 15h5" />
  </svg>
);

const QRDownloadIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="5" rx="0.5" /><rect x="16" y="3" width="5" height="5" rx="0.5" />
    <rect x="3" y="16" width="5" height="5" rx="0.5" />
    <path d="M21 21h.01M13 3v5h5M13 13h5v5M13 13H3M21 13v.01" />
  </svg>
);

const QUICK_ACTIONS = [
  { label: "Add Menu Item",      href: "/menu/items", icon: PlusCircleIcon },
  { label: "Manage Branches",   href: "/branches",   icon: MapPinIcon     },
  { label: "View Orders",       href: "/orders",     icon: ReceiptIcon    },
  { label: "Download QR Codes", href: "/branches",   icon: QRDownloadIcon },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:   { bg: "rgba(255,169,48,0.12)",  color: "var(--mango)",   border: "var(--mango)"  },
  CONFIRMED: { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6",        border: "#3B82F6"       },
  PREPARING: { bg: "rgba(139,92,246,0.12)",  color: "#8B5CF6",        border: "#8B5CF6"       },
  READY:     { bg: "rgba(143,163,0,0.12)",   color: "var(--lime)",    border: "var(--lime)"   },
  SERVED:    { bg: "var(--char-08)",         color: "var(--char-60)", border: "var(--char-30)"},
  CANCELLED: { bg: "var(--chili-10)",        color: "var(--chili)",   border: "var(--chili)"  },
};

// Decorative QR-like SVG pattern for hero banner
function DecorativeQRPattern() {
  const blocks = [
    [1,1,0,1,1,0,1,0],
    [1,0,0,0,1,0,1,1],
    [1,0,1,0,0,1,0,1],
    [0,1,1,1,0,0,1,0],
    [1,1,0,0,1,1,0,1],
    [0,0,1,0,1,0,1,1],
    [1,0,0,1,1,0,0,1],
    [1,1,0,1,0,1,1,0],
  ];
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ opacity: 0.10 }}>
      {blocks.map((row, ri) =>
        row.map((cell, ci) =>
          cell ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * 15 + 1}
              y={ri * 15 + 1}
              width="12"
              height="12"
              rx="2"
              fill="white"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("access_token");

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: () => api.get<Restaurant>("/restaurants/me"),
    enabled: hasToken,
    staleTime: 10 * 60_000,
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["analytics", "menu-summary"],
    queryFn: () => api.get<MenuSummary>("/analytics/menu-summary"),
    enabled: hasToken,
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["analytics", "qr-scans"],
    queryFn: () => api.get<QRStats>("/analytics/qr-scans"),
    enabled: hasToken,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => api.get<OrdersResponse>("/orders?page=1&limit=5"),
    enabled: hasToken,
  });

  const { data: mySub } = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => api.get<MySubscription>("/subscriptions/me"),
    enabled: hasToken,
    staleTime: 10 * 60_000,
  });

  const available = menu?.availability?.find(a => a.status === "AVAILABLE")?.count ?? 0;
  const soldOut   = menu?.availability?.find(a => a.status === "SOLD_OUT")?.count ?? 0;
  const topTables = scans?.byTable?.slice(0, 8) ?? [];
  const maxScans  = topTables[0]?.count ?? 1;

  const kpiStats = [
    { label: "Categories",      value: menu?.categories ?? "—",  icon: CategoryIcon, color: "var(--chili)",  bg: "var(--chili-10)",          accentColor: "#ff4630", isLoading: menuLoading  },
    { label: "Menu Items",      value: menu?.menuItems ?? "—",   icon: MenuIcon,     color: "#3B82F6",       bg: "#3b82f61a",                accentColor: "#3B82F6", isLoading: menuLoading  },
    { label: "Available Items", value: available,                icon: CheckIcon,    color: "var(--lime)",   bg: "rgba(143,163,0,0.12)",     accentColor: "#8fa300", isLoading: menuLoading  },
    { label: "QR Scans",        value: scans?.totalScans ?? "—", icon: QRIcon,       color: "var(--mango)",  bg: "rgba(255,169,48,0.12)",    accentColor: "#ffa930", isLoading: scansLoading },
  ];

  return (
    <div className="space-y-6">

      {/* ── Section 1: Hero Banner ─────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1c1710 0%, #2d2318 60%, #3d2f1e 100%)" }}
      >
        {/* Decorative pattern — top right */}
        <div className="absolute top-6 right-8 pointer-events-none select-none">
          <DecorativeQRPattern />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(143,163,0,0.25)", color: "#c6d400", border: "1px solid rgba(143,163,0,0.4)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
              Menu Active
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
            {getGreeting()}{restaurant?.name ? `, ${restaurant.name}` : ""}!
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Work Sans, sans-serif" }}>
            {formatDate()}
          </p>
        </div>

        {/* Hero bottom stats row */}
        <div className="relative z-10 flex flex-wrap gap-6 mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          {[
            { label: "Total Items", value: menu?.menuItems ?? "—", loading: menuLoading },
            { label: "QR Scans", value: scans?.totalScans ?? "—", loading: scansLoading },
            { label: "Categories", value: menu?.categories ?? "—", loading: menuLoading },
          ].map(({ label, value, loading }) => (
            <div key={label}>
              {loading ? (
                <div className="h-6 w-10 rounded animate-pulse mb-1" style={{ background: "rgba(255,255,255,0.15)" }} />
              ) : (
                <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "#ffffff" }}>
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
              )}
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: KPI Strip ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiStats.map(({ label, value, icon, color, bg, accentColor, isLoading }) => (
          <div
            key={label}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}
          >
            <div className="p-5 flex items-center gap-4 flex-1">
              {/* Icon box */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, color }}
              >
                {icon}
              </div>
              {/* Number + label */}
              <div className="min-w-0">
                {isLoading || value === "—" ? (
                  <div
                    className="h-8 w-14 rounded-lg animate-pulse mb-1"
                    style={{ background: "var(--char-08)" }}
                  />
                ) : (
                  <p
                    className="text-3xl font-black leading-none"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}
                  >
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </p>
                )}
                <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--char-60)" }}>
                  {label}
                </p>
              </div>
            </div>
            {/* Accent bar */}
            <div className="h-[3px] w-full" style={{ background: accentColor }} />
          </div>
        ))}
      </div>

      {/* ── QR Scan Trend ── */}
      {scans?.daily && scans.daily.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-black text-base" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>QR Scan Trend</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--chili)" }}>
                {scans.daily.slice(-7).reduce((s, d) => s + d.count, 0)}
              </p>
              <p className="text-xs" style={{ color: "var(--char-60)" }}>scans this week</p>
            </div>
          </div>
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-24">
            {(() => {
              const last7 = scans.daily.slice(-7);
              const max = Math.max(...last7.map(d => d.count), 1);
              return last7.map((d) => {
                const pct = max > 0 ? (d.count / max) * 100 : 0;
                const date = new Date(d.day);
                const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      <div className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg" style={{ background: "var(--char)", color: "var(--cream)" }}>
                        {d.count} scan{d.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-xl transition-all duration-300"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: isToday
                          ? "var(--chili)"
                          : pct > 0 ? "rgba(255,70,48,0.35)" : "var(--char-08)",
                      }}
                    />
                    {/* Day label */}
                    <span className="text-[10px] font-semibold" style={{ color: isToday ? "var(--chili)" : "var(--char-60)" }}>
                      {dayLabel}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ── Menu Health ── */}
      {menu?.availability && menu.availability.length > 0 && (() => {
        const total = menu.availability.reduce((s, a) => s + a.count, 0);
        const available = menu.availability.find(a => a.status === "AVAILABLE")?.count ?? 0;
        const soldOut = menu.availability.find(a => a.status === "SOLD_OUT")?.count ?? 0;
        const unavailable = menu.availability.find(a => a.status === "UNAVAILABLE")?.count ?? 0;
        const avPct = total > 0 ? Math.round((available / total) * 100) : 0;
        const soPct = total > 0 ? Math.round((soldOut / total) * 100) : 0;
        const unPct = total > 0 ? Math.round((unavailable / total) * 100) : 0;

        return (
          <div className="rounded-2xl p-6" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-base" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Menu Health</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>{total} items total</p>
              </div>
              <Link href="/menu/items" className="text-xs font-bold" style={{ color: "var(--chili)" }}>Manage →</Link>
            </div>

            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
              {avPct > 0 && <div style={{ width: `${avPct}%`, background: "var(--lime)", borderRadius: "999px 0 0 999px" }} />}
              {soPct > 0 && <div style={{ width: `${soPct}%`, background: "var(--mango)" }} />}
              {unPct > 0 && <div style={{ width: `${unPct}%`, background: "var(--char-15)", borderRadius: "0 999px 999px 0" }} />}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Available", count: available, pct: avPct, color: "var(--lime)" },
                { label: "Sold Out",  count: soldOut,   pct: soPct, color: "var(--mango)" },
                { label: "Unavailable", count: unavailable, pct: unPct, color: "var(--char-30)" },
              ].map(({ label, count, pct, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs font-medium" style={{ color: "var(--char-60)" }}>{label}</span>
                  <span className="text-xs font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{count}</span>
                  <span className="text-xs" style={{ color: "var(--char-30)" }}>({pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Variant & Addon Summary ── */}
      {menu && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Variant Groups", value: menu.variantGroups, sub: "customization options", color: "#3B82F6", bg: "#3b82f61a" },
            { label: "Addon Groups",   value: menu.addonGroups,   sub: "optional add-ons",     color: "#8B5CF6", bg: "rgba(139,92,246,0.10)" },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{value}</p>
                <p className="text-sm font-bold mt-0.5" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--char-60)" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 3: 2-column layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left col — Recent Orders */}
        <div
          className="lg:col-span-3 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: "var(--char-15)" }}
          >
            <div>
              <h2
                className="font-black text-base"
                style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}
              >
                Recent Orders
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>
                Latest 5 orders across all tables
              </p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold transition-opacity hover:opacity-70"
              style={{ color: "var(--chili)" }}
            >
              View all →
            </Link>
          </div>

          {/* Body */}
          {!recentOrders?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--char-08)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--char-30)" }}>
                  <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" /><path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--char-60)" }}>No orders yet</p>
              <p className="text-xs" style={{ color: "var(--char-30)" }}>Orders placed by customers will appear here</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--char-08)" }}>
              {recentOrders.data.map((order) => {
                const sc = STATUS_COLORS[order.status] ?? { bg: "var(--char-08)", color: "var(--char-60)", border: "var(--char-30)" };
                const shortId = order.id.slice(0, 8).toUpperCase();
                const timeStr = new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-4 pr-5 transition-colors"
                    style={{ borderLeft: `3px solid ${sc.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Left colored border is achieved via borderLeft above; add padding to compensate */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 py-3.5 pl-5">
                      <span
                        className="text-xs font-black shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}
                      >
                        #{shortId}
                      </span>
                      <p
                        className="flex-1 min-w-0 text-sm font-semibold truncate"
                        style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
                      >
                        {order.tableLabel}
                      </p>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0"
                        style={{ background: sc.bg, color: sc.color, fontFamily: "Space Grotesk, sans-serif" }}
                      >
                        {order.status}
                      </span>
                      <span
                        className="text-xs shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}
                      >
                        {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right col — Sold Out Alert + Top Tables */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Sold Out Alert */}
          {soldOut > 0 && (
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: "rgba(255,169,48,0.08)", border: "1.5px solid rgba(255,169,48,0.30)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(255,169,48,0.18)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mango)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--mango)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {soldOut} item{soldOut > 1 ? "s" : ""} sold out
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--char-60)" }}>
                  Update availability so customers see accurate options.
                </p>
                <Link
                  href="/menu/items"
                  className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: "var(--mango)" }}
                >
                  Fix Now →
                </Link>
              </div>
            </div>
          )}

          {/* Top Tables */}
          {topTables.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden flex-1"
              style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--char-15)" }}>
                <h2
                  className="font-black text-base"
                  style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}
                >
                  Top Tables
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Most active QR scan points</p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--char-08)" }}>
                {topTables.map((t, i) => {
                  const rankColor = i === 0 ? "#F59E0B" : i === 1 ? "var(--char-60)" : i === 2 ? "#92765A" : "var(--char-30)";
                  const pct = Math.round((t.count / maxScans) * 100);
                  return (
                    <div key={t.tableId} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className="w-5 text-center text-xs font-black shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: rankColor }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
                        >
                          {t.label}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "var(--char-08)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: i === 0 ? "#F59E0B" : "var(--chili)" }}
                            />
                          </div>
                          <span
                            className="text-xs font-bold shrink-0"
                            style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}
                          >
                            {t.count}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--char-30)" }}>{t.branchName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subscription Plan Card */}
          {mySub && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--char-15)", background: "var(--cream)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
                    {mySub.plan.name}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: mySub.status === "ACTIVE" ? "rgba(143,163,0,0.15)" : "var(--char-08)", color: mySub.status === "ACTIVE" ? "var(--lime)" : "var(--char-60)", fontFamily: "Space Grotesk, sans-serif" }}>
                    {mySub.status}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>
                  {mySub.plan.billingCycle.charAt(0) + mySub.plan.billingCycle.slice(1).toLowerCase()} · PKR {parseFloat(mySub.plan.price).toLocaleString()}
                </p>
              </div>
              <div className="px-5 py-4">
                {/* Days remaining bar */}
                {(() => {
                  const days = Math.ceil((new Date(mySub.endDate).getTime() - Date.now()) / 86_400_000);
                  const total = Math.ceil((new Date(mySub.endDate).getTime() - new Date(mySub.startDate).getTime()) / 86_400_000);
                  const pct = Math.max(0, Math.min(100, Math.round((days / total) * 100)));
                  const barColor = pct > 40 ? "var(--lime)" : pct > 15 ? "var(--mango)" : "var(--chili)";
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--char-60)" }}>Days remaining</span>
                        <span className="text-sm font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: barColor }}>{Math.max(0, days)}d</span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: "var(--char-60)" }}>
                        Expires {new Date(mySub.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  );
                })()}
                {/* Feature limits if present */}
                {mySub.plan.featureLimits && Object.keys(mySub.plan.featureLimits).length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--char-08)" }}>
                    {Object.entries(mySub.plan.featureLimits).slice(0, 3).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span style={{ color: "var(--char-60)" }}>{key.replace(/([A-Z])/g, ' $1').replace('max ', '').trim()}</span>
                        <span className="font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{val === 0 ? "∞" : val}</span>
                      </div>
                    ))}
                  </div>
                )}
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
              key={href + label}
              href={href}
              className="rounded-2xl p-5 flex items-center gap-4 transition-all group"
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

    </div>
  );
}
