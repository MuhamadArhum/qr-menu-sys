"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { logout } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard",     label: "Overview"      },
  { href: "/restaurants",   label: "Restaurants"   },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/plans",         label: "Plans"         },
  { href: "/audit",         label: "Audit Log"     },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Body scroll lock when drawer open
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
  const name = user?.email?.split("@")[0] ?? "";

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 h-14"
        style={{
          background: "var(--paper)",
          borderBottom: "1.5px solid rgba(28,23,16,0.1)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "var(--char)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <p className="font-black text-[13px] leading-tight" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
              Abyte Menu
            </p>
            <p className="text-[9px] font-bold tracking-widest uppercase leading-none" style={{ color: "var(--chili)" }}>
              Super Admin
            </p>
          </div>
        </Link>

        {/* Divider — desktop only */}
        <div className="hidden lg:block w-px h-5 shrink-0" style={{ background: "rgba(28,23,16,0.12)" }} />

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center px-3 h-14 text-sm font-semibold whitespace-nowrap transition-colors shrink-0"
                style={active
                  ? { color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }
                  : { color: "#6B5F52" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: "var(--chili)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Spacer (mobile) */}
        <div className="flex-1 lg:hidden" />

        {/* Platform badge — desktop only */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0"
          style={{ background: "rgba(143,163,0,0.1)", border: "1px solid rgba(143,163,0,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--lime)" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--lime)", fontFamily: "Space Grotesk, sans-serif" }}>Platform</span>
        </div>

        {/* Desktop user dropdown */}
        <div className="relative shrink-0 hidden lg:block" ref={dropRef}>
          <button
            onClick={() => setDropOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{ background: dropOpen ? "var(--cream)" : "transparent" }}
            onMouseEnter={e => { if (!dropOpen) e.currentTarget.style.background = "var(--cream)"; }}
            onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.background = "transparent"; }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: "var(--chili)", color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {initial}
            </div>
            <span className="text-sm font-semibold max-w-[90px] truncate" style={{ color: "var(--char)" }}>
              {name}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--char-60)", transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {dropOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-2xl shadow-xl overflow-hidden"
              style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.1)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(28,23,16,0.08)", background: "var(--cream)" }}>
                <p className="text-xs font-bold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{user?.email}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#9B8C7D" }}>Super Administrator</p>
              </div>
              <div className="p-2">
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all w-full"
                  style={{ color: "var(--chili)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,70,48,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl shrink-0 transition-all"
          style={{ background: mobileOpen ? "var(--cream)" : "transparent" }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-5 h-0.5 rounded-full transition-all duration-200"
            style={{
              background: "var(--char)",
              transform: mobileOpen ? "translateY(3px) rotate(45deg)" : "none",
            }}
          />
          <span
            className="block w-5 h-0.5 rounded-full my-1 transition-all duration-200"
            style={{
              background: "var(--char)",
              opacity: mobileOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-0.5 rounded-full transition-all duration-200"
            style={{
              background: "var(--char)",
              transform: mobileOpen ? "translateY(-3px) rotate(-45deg)" : "none",
            }}
          />
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        className="fixed top-14 left-0 right-0 z-30 lg:hidden"
        style={{
          background: "var(--paper)",
          borderBottom: "1.5px solid rgba(28,23,16,0.1)",
          maxHeight: mobileOpen ? "calc(100vh - 56px)" : "0",
          overflow: "hidden",
          transition: "max-height 0.2s ease",
        }}
      >
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 56px)" }}>
          {/* Nav links */}
          <nav className="px-4 pt-4 pb-2 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={active
                    ? { background: "rgba(255,70,48,0.08)", color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }
                    : { color: "#6B5F52" }}
                >
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full mr-3 shrink-0" style={{ background: "var(--chili)" }} />
                  )}
                  {!active && <span className="w-1.5 h-1.5 mr-3 shrink-0" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-4 my-3" style={{ height: "1px", background: "rgba(28,23,16,0.08)" }} />

          {/* User section */}
          <div className="px-4 pb-6">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid rgba(28,23,16,0.1)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--cream)" }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: "var(--chili)", color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>{name}</p>
                  <p className="text-[10px]" style={{ color: "#9B8C7D" }}>Super Administrator</p>
                </div>
              </div>
              <div className="p-2" style={{ background: "var(--paper)" }}>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm w-full transition-all"
                  style={{ color: "var(--chili)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,70,48,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
