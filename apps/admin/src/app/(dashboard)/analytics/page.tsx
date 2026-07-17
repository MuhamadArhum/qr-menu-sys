"use client";

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

function BarChart({ data }: { data: { day: string; count: number }[] }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const last14 = data.slice(-14);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
            Daily QR Scans
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Last 14 days</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--char-08)", color: "var(--char-60)" }}>
          {data.reduce((s, d) => s + d.count, 0)} total
        </span>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1.5 h-32">
        {last14.map((d) => {
          const pct = max > 0 ? (d.count / max) * 100 : 0;
          const date = new Date(d.day);
          const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg"
                  style={{ background: "var(--char)", color: "var(--cream)" }}>
                  {d.count} scan{d.count !== 1 ? "s" : ""}
                </div>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: pct > 0 ? "var(--chili)" : "var(--char-08)",
                  opacity: pct > 0 ? 1 : 0.4,
                }}
              />
              {/* Label */}
              <span className="text-[9px] truncate w-full text-center" style={{ color: "var(--char-40)" }}>
                {label.replace(" ", "\n")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: accent ?? "var(--char)" }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>{label}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["analytics", "qr-scans"],
    queryFn: () => api.get<QRStats>("/analytics/qr-scans"),
  });

  const { data: menu } = useQuery({
    queryKey: ["analytics", "menu-summary"],
    queryFn: () => api.get<MenuSummary>("/analytics/menu-summary"),
  });

  const available = menu?.availability?.find((a) => a.status === "AVAILABLE")?.count ?? 0;
  const soldOut   = menu?.availability?.find((a) => a.status === "SOLD_OUT")?.count ?? 0;
  const maxBranch = scans?.byBranch?.[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">QR scan stats and menu overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total QR Scans" value={scans?.totalScans ?? "—"} accent="var(--chili)" />
        <StatCard label="Menu Items"     value={menu?.menuItems ?? "—"} />
        <StatCard label="Available"      value={available} accent="var(--lime)" />
        <StatCard label="Sold Out"       value={soldOut}   accent={soldOut > 0 ? "var(--mango)" : undefined} />
      </div>

      {/* Daily chart */}
      {scans?.daily && scans.daily.length > 0 && (
        <BarChart data={scans.daily} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scans by branch */}
        {scans?.byBranch && scans.byBranch.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b font-bold text-sm" style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
              Scans by Branch
            </div>
            <div>
              {scans.byBranch.map((b) => {
                const pct = Math.round((b.count / maxBranch) * 100);
                return (
                  <div key={b.branchId} className="px-5 py-3 flex items-center gap-3 border-b last:border-0" style={{ borderColor: "var(--char-08)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--char)" }}>{b.branchName}</p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--chili)" }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
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
            <div className="px-5 py-4 border-b font-bold text-sm" style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
              Top Scanned Tables
            </div>
            <div>
              {scans.byTable.slice(0, 8).map((t, i) => (
                <div key={t.tableId} className="px-5 py-3 flex items-center gap-3 border-b last:border-0" style={{ borderColor: "var(--char-08)" }}>
                  <span className="w-5 text-center text-xs font-black shrink-0"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: i === 0 ? "var(--mango)" : "var(--char-40)" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--char)" }}>{t.label}</p>
                    <p className="text-xs truncate" style={{ color: "var(--char-60)" }}>{t.branchName}</p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability breakdown */}
        {menu?.availability && menu.availability.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b font-bold text-sm" style={{ borderColor: "var(--char-08)", color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
              Item Availability
            </div>
            <div>
              {menu.availability.map((a) => {
                const color = a.status === "AVAILABLE" ? "var(--lime)" : a.status === "SOLD_OUT" ? "var(--mango)" : "var(--char-40)";
                return (
                  <div key={a.status} className="px-5 py-3 flex items-center justify-between border-b last:border-0" style={{ borderColor: "var(--char-08)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-sm" style={{ color: "var(--char-60)" }}>{a.status.replace("_", " ")}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{a.count}</span>
                  </div>
                );
              })}
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
    </div>
  );
}
