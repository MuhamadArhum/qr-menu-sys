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

const STATS = [
  {
    key: "restaurants" as const,
    label: "Restaurants",
    color: "var(--chili)",
    bg: "var(--chili-10)",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
      </svg>
    ),
  },
  {
    key: "branches" as const,
    label: "Branches",
    color: "#3B82F6",
    bg: "#3b82f61a",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
  {
    key: "tables" as const,
    label: "Tables",
    color: "var(--mango)",
    bg: "rgba(255,169,48,0.12)",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5h18M3 12h18M6 7.5V18m12-10.5V18" />
      </svg>
    ),
  },
  {
    key: "totalQRScans" as const,
    label: "QR Scans",
    color: "var(--lime)",
    bg: "rgba(143,163,0,0.12)",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
      </svg>
    ),
  },
];

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "rgba(143,163,0,0.12)",  color: "var(--lime)"  },
    INACTIVE:  { bg: "var(--char-08)",         color: "var(--char-60)" },
    SUSPENDED: { bg: "var(--chili-10)",        color: "var(--chili)" },
    PENDING:   { bg: "rgba(255,169,48,0.12)", color: "var(--mango)" },
  };
  const s = map[status] ?? { bg: "var(--char-08)", color: "var(--char-60)" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color, fontFamily: "Space Grotesk, sans-serif" }}>
      {status}
    </span>
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            Platform Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--char-60)" }}>Abyte Menu · All tenants</p>
        </div>
        <span className="text-sm pt-1" style={{ color: "var(--char-60)" }}>{today}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATS.map(({ key, label, color, bg, icon }) => (
          <div key={key} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
              {icon}
            </div>
            <div>
              {overviewLoading ? (
                <div className="h-7 w-14 rounded-lg animate-pulse mb-1" style={{ background: "var(--char-08)" }} />
              ) : (
                <div className="text-2xl font-black leading-none"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
                  {overview?.[key] !== undefined ? overview[key].toLocaleString() : "—"}
                </div>
              )}
              <div className="text-xs mt-1.5 font-medium" style={{ color: "var(--char-60)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Restaurants */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--char-08)" }}>
          <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            Recent Restaurants
          </h2>
          <Link href="/restaurants" className="text-xs font-bold transition-colors" style={{ color: "var(--chili)" }}>
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--char-08)" }}>
                {["Restaurant", "Legal Name", "Status", "Created", ""].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-[11px] font-black tracking-widest uppercase"
                    style={{ color: "var(--char-60)", fontFamily: "Space Grotesk, sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "var(--char-08)" }}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: "var(--char-08)", width: j === 1 ? "60%" : j === 5 ? "30%" : "50%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentRes?.data.length ? (
                recentRes.data.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 transition-colors"
                    style={{ borderColor: "var(--char-08)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                        {r.displayName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--char-60)" }}>{r.legalName}</td>
                    <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char-60)" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/restaurants/${r.id}`}
                        className="text-xs font-bold transition-colors" style={{ color: "var(--chili)" }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: "var(--char-60)" }}>
                    No restaurants yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper)", border: "1.5px solid rgba(255,169,48,0.3)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "rgba(255,169,48,0.2)", background: "rgba(255,169,48,0.05)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mango)" }} />
              <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
                Expiring Soon
              </h2>
              <span className="text-xs" style={{ color: "var(--char-60)" }}>within 30 days</span>
            </div>
            <Link href="/subscriptions" className="text-xs font-bold" style={{ color: "var(--mango)" }}>
              Manage →
            </Link>
          </div>
          <ul>
            {expiringSoon.map(s => {
              const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000);
              const urgent = daysLeft <= 7;
              return (
                <li key={s.id} className="flex items-center justify-between px-5 py-3.5 border-b last:border-0"
                  style={{ borderColor: "var(--char-08)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                      {s.restaurant?.displayName ?? s.restaurantId}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--char-60)" }}>
                      Expires {new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                      <span className="font-bold" style={{ color: urgent ? "var(--chili)" : "var(--mango)" }}>
                        ({daysLeft}d left)
                      </span>
                    </p>
                  </div>
                  <Link href={`/restaurants/${s.restaurantId}`} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
                    Renew →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
