"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface QRStats {
  totalScans: number;
  byTable: { tableId: string; label: string; branchName: string; count: number }[];
  byBranch: { branchId: string; branchName: string; count: number }[];
  daily: { day: string; count: number }[];
}

interface MenuSummary {
  categories: number;
  menuItems: number;
  variantGroups: number;
  addonGroups: number;
  availability: { status: string; count: number }[];
}

interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  byBranch: { branchId: string; branchName: string; revenue: number; orders: number }[];
  daily: { day: string; revenue: number; orders: number }[];
}

const RANGES = [
  { label: "7d",  days: 7  },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function dateRange(days: number) {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function BarChart({
  title, subtitle, total, data, color, valueKey, labelFn,
}: {
  title: string; subtitle: string; total: string;
  data: any[]; color: string; valueKey: string;
  labelFn: (d: any) => string;
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{title}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>{subtitle}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--char-08)", color: "var(--char-60)" }}>
          {total}
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d, i) => {
          const pct = max > 0 ? (d[valueKey] / max) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg"
                  style={{ background: "var(--char)", color: "var(--cream)" }}>
                  {labelFn(d)}
                </div>
              </div>
              <div className="w-full rounded-t-lg transition-all duration-300"
                style={{ height: `${Math.max(pct, 2)}%`, background: pct > 0 ? color : "var(--char-08)", opacity: pct > 0 ? 1 : 0.4 }} />
              <span className="text-[9px] truncate w-full text-center" style={{ color: "var(--char-40)" }}>
                {new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: accent ?? "var(--char)" }}>
        {value}
      </p>
      <p className="text-xs mt-1 font-medium" style={{ color: "var(--char-60)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--char-40)" }}>{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30 | 90>(30);
  const [activeTab, setActiveTab] = useState<"revenue" | "scans">("revenue");
  const { from, to } = dateRange(rangeDays);

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ["analytics", "revenue", rangeDays],
    queryFn: () => api.get<RevenueStats>(`/analytics/revenue?from=${from}&to=${to}`),
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["analytics", "qr-scans", rangeDays],
    queryFn: () => api.get<QRStats>(`/analytics/qr-scans?from=${from}&to=${to}`),
  });

  const { data: menu } = useQuery({
    queryKey: ["analytics", "menu-summary"],
    queryFn: () => api.get<MenuSummary>("/analytics/menu-summary"),
  });

  const available = menu?.availability?.find(a => a.status === "AVAILABLE")?.count ?? 0;
  const soldOut   = menu?.availability?.find(a => a.status === "SOLD_OUT")?.count ?? 0;
  const maxRevBranch = revenue?.byBranch?.[0]?.revenue ?? 1;
  const maxScanBranch = scans?.byBranch?.[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Revenue, orders, and QR scan insights</p>
        </div>

        {/* Date range picker */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--char-15)" }}>
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRangeDays(r.days as any)}
              className="px-3 py-2 text-xs font-bold transition-all"
              style={rangeDays === r.days
                ? { background: "var(--char)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--char-60)" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["revenue", "scans"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all border capitalize"
            style={activeTab === tab
              ? { background: "var(--char)", color: "#fff", borderColor: "transparent" }
              : { background: "var(--paper)", color: "var(--char-60)", borderColor: "var(--char-15)" }}>
            {tab === "revenue" ? "💰 Revenue" : "📱 QR Scans"}
          </button>
        ))}
      </div>

      {/* ── REVENUE TAB ─────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={revLoading ? "—" : fmt(revenue?.totalRevenue ?? 0)}
              sub={`last ${rangeDays} days`}
              accent="var(--lime)"
            />
            <StatCard
              label="Orders Served"
              value={revLoading ? "—" : String(revenue?.totalOrders ?? 0)}
              sub="completed"
            />
            <StatCard
              label="Avg Order Value"
              value={revLoading || !revenue?.totalOrders ? "—"
                : fmt((revenue.totalRevenue) / (revenue.totalOrders))}
              accent="var(--mango)"
            />
            <StatCard
              label="Menu Items"
              value={menu?.menuItems !== undefined ? String(menu.menuItems) : "—"}
              sub={`${available} available · ${soldOut} sold out`}
            />
          </div>

          {/* Daily revenue chart */}
          {!revLoading && revenue?.daily && revenue.daily.length > 0 && (
            <BarChart
              title="Daily Revenue"
              subtitle={`Last ${rangeDays} days`}
              total={`${fmt(revenue.totalRevenue)} total`}
              data={revenue.daily}
              color="var(--lime)"
              valueKey="revenue"
              labelFn={d => `${fmt(d.revenue)} · ${d.orders} order${d.orders !== 1 ? "s" : ""}`}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue by branch */}
            {revenue?.byBranch && revenue.byBranch.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b font-bold text-sm"
                  style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  Revenue by Branch
                </div>
                <div>
                  {revenue.byBranch.map(b => {
                    const pct = Math.round((b.revenue / maxRevBranch) * 100);
                    return (
                      <div key={b.branchId} className="px-5 py-3 flex items-center gap-3 border-b last:border-0"
                        style={{ borderColor: "var(--char-08)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--char)" }}>{b.branchName}</p>
                            <span className="text-[11px] ml-2 shrink-0" style={{ color: "var(--char-60)" }}>
                              {b.orders} orders
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--lime)" }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0 ml-2"
                          style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                          {fmt(b.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Item availability */}
            {menu?.availability && menu.availability.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b font-bold text-sm"
                  style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  Item Availability
                </div>
                <div>
                  {menu.availability.map(a => {
                    const color = a.status === "AVAILABLE" ? "var(--lime)" : a.status === "SOLD_OUT" ? "var(--mango)" : "var(--char-40)";
                    const total = menu.availability.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((a.count / total) * 100) : 0;
                    return (
                      <div key={a.status} className="px-5 py-3 flex items-center gap-3 border-b last:border-0"
                        style={{ borderColor: "var(--char-08)" }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm" style={{ color: "var(--char-60)" }}>{a.status.replace("_", " ")}</span>
                            <span className="text-[11px]" style={{ color: "var(--char-40)" }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0"
                          style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                          {a.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!revLoading && (!revenue || revenue.totalOrders === 0) && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">💰</p>
              <p className="font-bold mb-1" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>No revenue data yet</p>
              <p className="text-sm" style={{ color: "var(--char-60)" }}>Revenue appears once orders are marked as Served.</p>
            </div>
          )}
        </>
      )}

      {/* ── QR SCANS TAB ────────────────────────────────────────── */}
      {activeTab === "scans" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total QR Scans" value={scans?.totalScans !== undefined ? String(scans.totalScans) : "—"} accent="var(--chili)" sub={`last ${rangeDays} days`} />
            <StatCard label="Menu Items"     value={menu?.menuItems !== undefined ? String(menu.menuItems) : "—"} />
            <StatCard label="Available"      value={String(available)} accent="var(--lime)" />
            <StatCard label="Sold Out"       value={String(soldOut)} accent={soldOut > 0 ? "var(--mango)" : undefined} />
          </div>

          {/* Daily scans chart */}
          {!scansLoading && scans?.daily && scans.daily.length > 0 && (
            <BarChart
              title="Daily QR Scans"
              subtitle={`Last ${rangeDays} days`}
              total={`${scans.totalScans} total`}
              data={scans.daily}
              color="var(--chili)"
              valueKey="count"
              labelFn={d => `${d.count} scan${d.count !== 1 ? "s" : ""}`}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scans by branch */}
            {scans?.byBranch && scans.byBranch.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b font-bold text-sm"
                  style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  Scans by Branch
                </div>
                <div>
                  {scans.byBranch.map(b => {
                    const pct = Math.round((b.count / maxScanBranch) * 100);
                    return (
                      <div key={b.branchId} className="px-5 py-3 flex items-center gap-3 border-b last:border-0"
                        style={{ borderColor: "var(--char-08)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate mb-1" style={{ color: "var(--char)" }}>{b.branchName}</p>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--chili)" }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0"
                          style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                          {b.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top tables */}
            {scans?.byTable && scans.byTable.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b font-bold text-sm"
                  style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  Top Scanned Tables
                </div>
                <div>
                  {scans.byTable.slice(0, 8).map((t, i) => (
                    <div key={t.tableId} className="px-5 py-3 flex items-center gap-3 border-b last:border-0"
                      style={{ borderColor: "var(--char-08)" }}>
                      <span className="w-5 text-center text-xs font-black shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: i === 0 ? "var(--mango)" : "var(--char-40)" }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--char)" }}>{t.label}</p>
                        <p className="text-xs truncate" style={{ color: "var(--char-60)" }}>{t.branchName}</p>
                      </div>
                      <span className="text-sm font-bold shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!scansLoading && (!scans || scans.totalScans === 0) && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">📱</p>
              <p className="font-bold mb-1" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>No QR scans yet</p>
              <p className="text-sm" style={{ color: "var(--char-60)" }}>Share your QR codes with customers to start tracking.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
