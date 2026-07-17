"use client";

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
}

interface Restaurant { name: string }

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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const MenuIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const CheckIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const QRIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="5" rx="0.5" /><rect x="16" y="3" width="5" height="5" rx="0.5" />
    <rect x="3" y="16" width="5" height="5" rx="0.5" />
    <path d="M21 21h.01M13 3v5h5M13 13h5v5M13 13H3M21 13v.01" />
  </svg>
);

function KPICard({ label, value, icon, color, bgColor }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; bgColor: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{value}</p>
      <p className="text-sm mt-1" style={{ color: "var(--char-60)" }}>{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: () => api.get<Restaurant>("/restaurants/me"),
    enabled: !!user,
  });

  const { data: menu } = useQuery({
    queryKey: ["analytics", "menu-summary"],
    queryFn: () => api.get<MenuSummary>("/analytics/menu-summary"),
    enabled: !!user,
  });

  const { data: scans } = useQuery({
    queryKey: ["analytics", "qr-scans"],
    queryFn: () => api.get<QRStats>("/analytics/qr-scans"),
    enabled: !!user,
  });

  const available = menu?.availability?.find(a => a.status === "AVAILABLE")?.count ?? 0;
  const soldOut = menu?.availability?.find(a => a.status === "SOLD_OUT")?.count ?? 0;
  const topTables = scans?.byTable?.slice(0, 8) ?? [];
  const maxScans = topTables[0]?.count ?? 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
          {getGreeting()}! 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--char-60)" }}>
          {restaurant?.name && (
            <span className="font-semibold" style={{ color: "var(--char)" }}>{restaurant.name} · </span>
          )}
          {formatDate()}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard label="Categories"      value={menu?.categories ?? "—"} icon={CategoryIcon} color="var(--chili)"  bgColor="var(--chili-10)" />
        <KPICard label="Menu Items"      value={menu?.menuItems ?? "—"}  icon={MenuIcon}     color="#3B82F6"       bgColor="#3b82f61a"      />
        <KPICard label="Available Items" value={available}               icon={CheckIcon}    color="var(--lime)"   bgColor="rgba(143,163,0,0.12)" />
        <KPICard label="QR Scans"        value={scans?.totalScans ?? "—"} icon={QRIcon}      color="var(--mango)"  bgColor="rgba(255,169,48,0.12)" />
      </div>

      {/* Sold Out Warning */}
      {soldOut > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "rgba(255,169,48,0.08)", border: "1.5px solid rgba(255,169,48,0.25)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mango)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--mango)" }}>
            {soldOut} item{soldOut > 1 ? "s" : ""} marked as Sold Out. Update availability in Menu.
          </p>
        </div>
      )}

      {/* Top Tables */}
      {topTables.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--char-15)" }}>
            <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
              Top Scanned Tables
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Most active QR code scan points</p>
          </div>
          <div>
            {topTables.map((t, i) => (
              <div key={t.tableId} className="px-6 py-3.5 flex items-center gap-4 border-b last:border-0" style={{ borderColor: "var(--char-08)" }}>
                <span className="w-6 text-center text-xs font-black shrink-0"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: i === 0 ? "var(--mango)" : i < 3 ? "var(--char-60)" : "var(--char-30)" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{t.label}</p>
                  <p className="text-xs truncate" style={{ color: "var(--char-60)" }}>{t.branchName}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((t.count / maxScans) * 100)}%`, background: "var(--chili)" }} />
                  </div>
                  <span className="text-sm font-bold w-16 text-right" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                    {t.count} <span className="font-normal text-xs" style={{ color: "var(--char-60)" }}>scans</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
