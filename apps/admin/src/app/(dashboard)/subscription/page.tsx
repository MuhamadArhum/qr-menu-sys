"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  plan: {
    name: string;
    billingCycle: string;
    price: string;
    featureLimits: Record<string, unknown>;
  };
}

type StatusStyle = { bg: string; color: string; label: string };
const STATUS_STYLE: Partial<Record<string, StatusStyle>> = {
  ACTIVE:    { bg: "rgba(143,163,0,0.1)",  color: "var(--lime)",    label: "Active"    },
  EXPIRED:   { bg: "rgba(255,70,48,0.1)",  color: "var(--chili)",   label: "Expired"   },
  CANCELLED: { bg: "var(--char-08)",       color: "var(--char-60)", label: "Cancelled" },
  TRIAL:     { bg: "rgba(59,130,246,0.1)", color: "#3B82F6",        label: "Trial"     },
};
const DEFAULT_STATUS_STYLE: StatusStyle = { bg: "rgba(143,163,0,0.1)", color: "var(--lime)", label: "Active" };

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function DaysBar({ days, total }: { days: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((days / total) * 100)));
  const color = pct > 40 ? "var(--lime)" : pct > 15 ? "var(--mango)" : "var(--chili)";
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--char-08)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--char-08)" }}>
      <span className="text-sm" style={{ color: "var(--char-60)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{value}</span>
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => api.get<Subscription>("/subscription/me"),
  });

  if (isLoading) {
    return (
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="page-title">Subscription</h1>
          <p className="page-subtitle">Your current plan &amp; billing details</p>
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded-xl" style={{ background: "var(--char-08)" }} />
          <div className="h-4 w-2/3 rounded-xl" style={{ background: "var(--char-08)" }} />
          <div className="h-2 w-full rounded-full" style={{ background: "var(--char-08)" }} />
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="page-title">Subscription</h1>
          <p className="page-subtitle">Your current plan &amp; billing details</p>
        </div>
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(255,70,48,0.08)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--chili)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <p className="font-bold text-base mb-1" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
            No Active Subscription
          </p>
          <p className="text-sm" style={{ color: "var(--char-60)" }}>
            Contact your administrator to assign a subscription plan.
          </p>
        </div>
      </div>
    );
  }

  const days = daysRemaining(sub.endDate);
  const totalDays = Math.ceil(
    (new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / 86_400_000
  );
  const statusStyle = STATUS_STYLE[sub.status] ?? DEFAULT_STATUS_STYLE;
  const price = parseFloat(sub.plan.price);
  const daysColor = days > 30 ? "var(--lime)" : days > 7 ? "var(--mango)" : "var(--chili)";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Subscription</h1>
        <p className="page-subtitle">Your current plan &amp; billing details</p>
      </div>

      {/* Plan card */}
      <div className="card p-6">
        {/* Plan header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--char-40)" }}>
              Current Plan
            </p>
            <h2 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
              {sub.plan.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--char-60)" }}>
              {sub.plan.billingCycle.charAt(0) + sub.plan.billingCycle.slice(1).toLowerCase()} billing
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
              PKR {price.toLocaleString()}
            </p>
            <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.color }}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Days remaining bar */}
        {sub.status === "ACTIVE" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "var(--char-60)" }}>Days remaining</span>
              <span className="text-sm font-black" style={{ color: daysColor, fontFamily: "JetBrains Mono, monospace" }}>
                {days > 0 ? `${days} days` : "Expired"}
              </span>
            </div>
            <DaysBar days={Math.max(0, days)} total={totalDays} />
            {days <= 30 && days > 0 && (
              <p className="text-xs mt-2 font-medium" style={{ color: "var(--mango)" }}>
                ⚠ Your plan expires soon. Contact your admin to renew.
              </p>
            )}
            {days <= 0 && (
              <p className="text-xs mt-2 font-medium" style={{ color: "var(--chili)" }}>
                Your subscription has expired. Contact your admin to renew.
              </p>
            )}
          </div>
        )}

        {/* Details */}
        <div>
          <InfoRow label="Start Date" value={new Date(sub.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
          <InfoRow label="End Date"   value={new Date(sub.endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
          <InfoRow label="Status"     value={statusStyle.label} />
          <InfoRow label="Billing"    value={sub.plan.billingCycle.charAt(0) + sub.plan.billingCycle.slice(1).toLowerCase()} />
        </div>
      </div>

      {/* Feature limits */}
      {sub.plan.featureLimits && Object.keys(sub.plan.featureLimits).length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
            Plan Features &amp; Limits
          </h3>
          <div>
            {Object.entries(sub.plan.featureLimits).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: "var(--char-08)" }}>
                <span className="text-sm capitalize" style={{ color: "var(--char-60)" }}>
                  {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--char)", fontFamily: "JetBrains Mono, monospace" }}>
                  {value === null ? "Unlimited" : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: "var(--char-40)" }}>
        To upgrade or change your plan, contact{" "}
        <Link href="/settings" className="underline" style={{ color: "var(--chili)" }}>your account administrator</Link>.
      </p>
    </div>
  );
}
