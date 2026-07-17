"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { logout } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard",    label: "Dashboard"    },
  { href: "/menu",         label: "Menu"         },
  { href: "/branches",     label: "Branches"     },
  { href: "/orders",       label: "Orders",      live: true },
  { href: "/kitchen",      label: "Kitchen"      },
  { href: "/staff",        label: "Staff"        },
  { href: "/analytics",    label: "Analytics"    },
  { href: "/subscription", label: "Subscription" },
  { href: "/settings",     label: "Settings"     },
];

const SettingsIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
  </svg>
);

const SignOutIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [dropOpen, setDropOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef   = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    setDropOpen(false);
    setMobileOpen(false);
    await logout();
    setUser(null);
    router.push("/login");
    toast.success("Logged out");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  const name    = user?.email?.split("@")[0] ?? "";

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center px-4 sm:px-6 h-14 gap-4"
        style={{ background: "var(--paper)", borderBottom: "1.5px solid rgba(28,23,16,0.1)" }}
      >
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 mr-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "var(--chili)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
          </div>
          <span className="font-black text-[15px]" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            Abyte Menu
          </span>
        </Link>

        {/* ── Desktop nav links (lg+) ── */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-1.5 px-3 h-14 text-sm font-semibold whitespace-nowrap transition-colors shrink-0"
                style={active
                  ? { color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }
                  : { color: "#6B5F52" }}
              >
                {item.label}
                {item.live && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--chili)" }}/>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--chili)" }}/>
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: "var(--chili)" }}/>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer on tablet */}
        <div className="flex-1 lg:hidden" />

        {/* ── User dropdown (desktop) ── */}
        <div className="hidden sm:block relative shrink-0" ref={dropRef}>
          <button
            onClick={() => setDropOpen(v => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
            style={{ background: dropOpen ? "var(--cream)" : "transparent" }}
            onMouseEnter={e => { if (!dropOpen) e.currentTarget.style.background = "var(--cream)"; }}
            onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.background = "transparent"; }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: "var(--char)", color: "var(--cream)", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {initial}
            </div>
            <span className="text-sm font-semibold hidden md:block max-w-[90px] truncate" style={{ color: "var(--char)" }}>
              {name}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--char-60)", transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {dropOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-2xl shadow-xl overflow-hidden"
              style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.1)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(28,23,16,0.08)", background: "var(--cream)" }}>
                <p className="text-xs font-bold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  {user?.email}
                </p>
                <p className="text-[10px] mt-0.5 capitalize" style={{ color: "#9B8C7D" }}>
                  {user?.role?.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
              <div className="p-2">
                <Link href="/settings" onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm w-full transition-all"
                  style={{ color: "var(--char)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cream)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {SettingsIcon} Settings
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm w-full mt-0.5 transition-all"
                  style={{ color: "var(--chili)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,70,48,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {SignOutIcon} Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Hamburger (< lg) ── */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="lg:hidden flex flex-col items-center justify-center w-9 h-9 rounded-xl gap-1.5 transition-all shrink-0"
          style={{ background: mobileOpen ? "var(--cream)" : "transparent" }}
          aria-label="Toggle menu"
        >
          <span className="w-5 h-0.5 rounded-full transition-all" style={{ background: "var(--char)", transform: mobileOpen ? "rotate(45deg) translate(2px,3px)" : "none" }}/>
          <span className="w-5 h-0.5 rounded-full transition-all" style={{ background: "var(--char)", opacity: mobileOpen ? 0 : 1 }}/>
          <span className="w-5 h-0.5 rounded-full transition-all" style={{ background: "var(--char)", transform: mobileOpen ? "rotate(-45deg) translate(2px,-3px)" : "none" }}/>
        </button>
      </header>

      {/* ── Mobile drawer backdrop ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(28,23,16,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      <div
        className="fixed top-14 left-0 right-0 z-30 lg:hidden overflow-y-auto transition-all duration-200"
        style={{
          background: "var(--paper)",
          borderBottom: "1.5px solid rgba(28,23,16,0.1)",
          maxHeight: mobileOpen ? "calc(100vh - 56px)" : "0",
          overflow: "hidden",
        }}
      >
        <div className="px-4 py-3 space-y-1">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={active
                  ? { background: "rgba(255,70,48,0.09)", color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }
                  : { color: "#6B5F52" }}
              >
                <span>{item.label}</span>
                {item.live && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--chili)" }}/>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--chili)" }}/>
                  </span>
                )}
                {active && !item.live && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--chili)" }}/>
                )}
              </Link>
            );
          })}
        </div>

        {/* User section in mobile drawer */}
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--cream)", border: "1.5px solid rgba(28,23,16,0.08)" }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(28,23,16,0.08)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: "var(--char)", color: "var(--cream)", fontFamily: "Space Grotesk, sans-serif" }}>
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                {user?.email}
              </p>
              <p className="text-xs capitalize mt-0.5" style={{ color: "#9B8C7D" }}>
                {user?.role?.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-all"
            style={{ color: "var(--chili)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,70,48,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {SignOutIcon}
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
