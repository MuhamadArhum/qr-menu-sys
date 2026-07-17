"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/restaurants", label: "Restaurants", icon: "🏪" },
  { href: "/subscriptions", label: "Subscriptions", icon: "💳" },
  { href: "/plans", label: "Plans", icon: "📦" },
  { href: "/audit", label: "Audit Log", icon: "📋" },
];

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

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-zinc-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">⚡</span>
        </div>
        <div>
          <p className="font-semibold text-zinc-900 text-xs">Abyte Menu</p>
          <p className="text-[10px] text-zinc-400">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 p-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-100 p-3">
        <div className="px-1 mb-2">
          <p className="text-xs font-medium text-zinc-900 truncate">{user?.email}</p>
          <p className="text-[10px] text-zinc-400">Super Admin</p>
        </div>
        <button onClick={handleLogout} className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded-lg">
          Sign out
        </button>
      </div>
    </aside>
  );
}
