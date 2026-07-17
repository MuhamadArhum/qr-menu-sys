"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

// ─── Icons ───────────────────────────────────────────────────────────────────

const I = {
  Dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Menu: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M3 12h18M3 19h18" />
    </svg>
  ),
  Branches: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
    </svg>
  ),
  Orders: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  Kitchen: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </svg>
  ),
  Staff: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  ),
  Analytics: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  Settings: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  SignOut: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

// ─── Nav groups ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard",        icon: I.Dashboard },
      { href: "/menu",      label: "Menu",              icon: I.Menu      },
      { href: "/branches",  label: "Branches & Tables", icon: I.Branches  },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/orders",    label: "Live Orders",       icon: I.Orders,   live: true },
      { href: "/kitchen",   label: "Kitchen Display",   icon: I.Kitchen   },
      { href: "/staff",     label: "Staff",             icon: I.Staff     },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/analytics", label: "Analytics",         icon: I.Analytics },
      { href: "/settings",  label: "Settings",          icon: I.Settings  },
    ],
  },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({ href, label, icon, active, live }: {
  href: string; label: string; icon: React.ReactNode; active: boolean; live?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
      style={active
        ? { background: "rgba(255,70,48,0.09)", color: "var(--chili)", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }
        : { color: "#6B5F52" }}
    >
      {/* Icon box */}
      <span
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
        style={active
          ? { background: "var(--chili)", color: "#fff", boxShadow: "0 3px 10px rgba(255,70,48,0.35)" }
          : { background: "rgba(107,95,82,0.1)", color: "#6B5F52" }}
      >
        {icon}
      </span>

      <span className="flex-1 leading-none">{label}</span>

      {/* Live dot */}
      {live && (
        <span className="shrink-0 flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--chili)" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--chili)" }} />
          </span>
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/login");
    toast.success("Logged out");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: "var(--paper)",
        borderRight: "1.5px solid rgba(28,23,16,0.1)",
      }}
    >
      {/* ── Brand ── */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
            style={{ background: "var(--chili)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <div>
            <p className="font-black text-[15px] leading-tight" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
              Abyte Menu
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "#9B8C7D" }}>
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-4 h-px" style={{ background: "rgba(28,23,16,0.07)" }} />

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="text-[10px] font-black tracking-widest uppercase mb-1.5 px-3"
              style={{ color: "#B5A898" }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    live={item.live}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User card ── */}
      <div className="p-4 mt-2">
        <div
          className="rounded-2xl p-3"
          style={{ background: "var(--cream)", border: "1.5px solid rgba(28,23,16,0.08)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm"
              style={{ background: "var(--char)", color: "var(--cream)", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-bold truncate leading-tight"
                style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}
              >
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] mt-0.5 capitalize truncate" style={{ color: "#9B8C7D" }}>
                {user?.role?.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(255,70,48,0.07)", color: "var(--chili)", border: "1px solid rgba(255,70,48,0.18)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,70,48,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,70,48,0.07)"; }}
          >
            {I.SignOut}
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
