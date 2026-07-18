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
}

interface Restaurant { name: string }

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

const PlusCircleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
  </svg>
);

const MapPinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
  </svg>
);

const ReceiptIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" /><path d="M8 7h8M8 11h8M8 15h5" />
  </svg>
);

const QRDownloadIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="5" rx="0.5" /><rect x="16" y="3" width="5" height="5" rx="0.5" />
    <rect x="3" y="16" width="5" height="5" rx="0.5" />
    <path d="M21 21h.01M13 3v5h5M13 13h5v5M13 13H3M21 13v.01" />
  </svg>
);

const QUICK_ACTIONS = [
  { label: "Add Menu Item",     href: "/menu/items", icon: PlusCircleIcon },
  { label: "Manage Branches",  href: "/branches",   icon: MapPinIcon     },
  { label: "View Orders",      href: "/orders",     icon: ReceiptIcon    },
  { label: "Download QR Codes",href: "/branches",   icon: QRDownloadIcon },
];

function KPICard({ label, value, icon, color, bgColor, isLoading }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; bgColor: string; isLoading?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bgColor, color }}>
        {icon}
      </div>
      {isLoading || value === "—" ? (
        <div className="h-7 w-14 rounded-lg animate-pulse mb-1" style={{ background: "var(--char-08)" }} />
      ) : (
        <p className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>{value}</p>
      )}
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

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["analytics", "menu-summary"],
    queryFn: () => api.get<MenuSummary>("/analytics/menu-summary"),
    enabled: !!user,
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["analytics", "qr-scans"],
    queryFn: () => api.get<QRStats>("/analytics/qr-scans"),
    enabled: !!user,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => api.get<OrdersResponse>("/orders?page=1&limit=5"),
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
        <KPICard label="Categories"      value={menu?.categories ?? "—"}  icon={CategoryIcon} color="var(--chili)"  bgColor="var(--chili-10)"       isLoading={menuLoading}  />
        <KPICard label="Menu Items"      value={menu?.menuItems ?? "—"}   icon={MenuIcon}     color="#3B82F6"       bgColor="#3b82f61a"             isLoading={menuLoading}  />
        <KPICard label="Available Items" value={available}                icon={CheckIcon}    color="var(--lime)"   bgColor="rgba(143,163,0,0.12)" isLoading={menuLoading}  />
        <KPICard label="QR Scans"        value={scans?.totalScans ?? "—"} icon={QRIcon}       color="var(--mango)"  bgColor="rgba(255,169,48,0.12)" isLoading={scansLoading} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {QUICK_ACTIONS.map(({ label, href, icon }) => (
          <Link key={href + label} href={href}
            className="rounded-2xl p-4 flex items-center gap-3 transition-colors"
            style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--chili)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--char-15)")}>
            <span style={{ color: "var(--chili)" }}>{icon}</span>
            <span className="text-sm font-semibold leading-tight" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
              {label}
            </span>
          </Link>
        ))}
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

      {/* Recent Orders */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--char-15)" }}>
          <div>
            <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Recent Orders</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>Latest 5 orders across all tables</p>
          </div>
          <Link href="/orders" className="text-xs font-bold transition-colors" style={{ color: "var(--chili)" }}>
            View all →
          </Link>
        </div>
        {!recentOrders?.data?.length ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--char-60)" }}>No orders yet.</div>
        ) : (
          <div>
            {recentOrders.data.map((order) => {
              const statusColors: Record<string, { bg: string; color: string }> = {
                PENDING:    { bg: "rgba(255,169,48,0.12)",   color: "var(--mango)"  },
                CONFIRMED:  { bg: "rgba(59,130,246,0.12)",   color: "#3B82F6"       },
                PREPARING:  { bg: "rgba(139,92,246,0.12)",   color: "#8B5CF6"       },
                READY:      { bg: "rgba(143,163,0,0.12)",    color: "var(--lime)"   },
                SERVED:     { bg: "var(--char-08)",          color: "var(--char-60)"},
                CANCELLED:  { bg: "var(--chili-10)",         color: "var(--chili)"  },
              };
              const sc = statusColors[order.status] ?? { bg: "var(--char-08)", color: "var(--char-60)" };
              const shortId = order.id.slice(0, 8).toUpperCase();
              const timeStr = new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={order.id} className="px-6 py-3.5 flex items-center gap-4 border-b last:border-0"
                  style={{ borderColor: "var(--char-08)" }}>
                  <span className="text-xs font-black shrink-0"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>
                    #{shortId}
                  </span>
                  <p className="flex-1 min-w-0 text-sm font-semibold truncate"
                    style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                    {order.tableLabel}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0"
                    style={{ background: sc.bg, color: sc.color, fontFamily: "Space Grotesk, sans-serif" }}>
                    {order.status}
                  </span>
                  <span className="text-xs shrink-0" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>
                    {timeStr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
