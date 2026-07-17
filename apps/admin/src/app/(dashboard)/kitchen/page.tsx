"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  selectedVariants: any[];
  selectedAddons: any[];
  note?: string;
}

interface Order {
  id: string;
  status: string;
  note?: string;
  totalAmount: string;
  createdAt: string;
  table: { id: string; label: string };
  branch: { id: string; name: string };
  items: OrderItem[];
}

interface Branch { id: string; name: string }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Pending",   color: "var(--chili)", bg: "var(--chili-10)"         },
  CONFIRMED: { label: "Confirmed", color: "#3B82F6",      bg: "#3b82f61a"               },
  PREPARING: { label: "Cooking",   color: "var(--mango)", bg: "rgba(255,169,48,0.12)"   },
};

function minutesAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
}

function clockStr(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const qs = branchId ? `?branchId=${branchId}` : "";
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["kitchen-orders", branchId],
    queryFn: () => api.get<Order[]>(`/orders/kitchen${qs}`),
    refetchInterval: 5_000,
  });

  const sorted = [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Failed"),
  });

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8" style={{ background: "var(--char)", minHeight: "calc(100vh - 56px)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ background: "rgba(28,23,16,0.95)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--cream)" }}>
            Kitchen Display
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--lime)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--lime)" }}>Live · 5s refresh</span>
          </div>
          {branches.length > 0 && (
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 focus:outline-none appearance-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--cream)" }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
        <div className="text-lg font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--cream)" }}>
          {clockStr(now)}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-lg" style={{ color: "rgba(255,247,234,0.4)" }}>
            Loading orders…
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-3xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "rgba(255,247,234,0.6)" }}>
              All Clear!
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,247,234,0.3)" }}>No active kitchen orders</p>
          </div>
        )}

        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sorted.map(order => (
              <KitchenCard key={order.id} order={order} isPending={isPending}
                onStatusChange={status => updateStatus({ id: order.id, status })} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function KitchenCard({ order, isPending, onStatusChange }: {
  order: Order; isPending: boolean; onStatusChange: (s: string) => void;
}) {
  const mins = minutesAgo(order.createdAt);
  const urgent = mins > 15;
  const meta = STATUS_META[order.status] ?? { label: "Unknown", color: "var(--char-60)", bg: "var(--char-08)" };

  return (
    <div className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: urgent ? "2px solid var(--chili)" : "1.5px solid rgba(255,255,255,0.1)",
        boxShadow: urgent ? "0 0 0 4px var(--chili-10)" : "none",
      }}>
      {/* Status bar */}
      <div className="h-1 w-full" style={{ background: meta.color }} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-dashed"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
              style={{ background: "var(--cream)", color: "var(--char)", fontFamily: "JetBrains Mono, monospace" }}>
              TABLE
            </div>
            <span className="text-4xl font-black leading-none"
              style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--cream)" }}>
              {order.table.label}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "rgba(255,247,234,0.5)" }}>{order.branch.name}</p>
          <p className="text-xs mt-0.5" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(255,247,234,0.35)" }}>
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-2xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: urgent ? "var(--chili)" : "rgba(255,247,234,0.6)" }}>
            {mins}m
          </span>
          {urgent && <span className="text-[10px] font-bold" style={{ color: "var(--chili)" }}>URGENT</span>}
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-4 flex-1 space-y-3">
        {order.items.map(item => (
          <div key={item.id}>
            <p className="text-lg font-bold" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--cream)" }}>
              <span style={{ color: "var(--chili)" }}>{item.quantity}×</span> {item.menuItemName}
            </p>
            {item.selectedVariants?.length > 0 && (
              <ul className="ml-4 mt-0.5 space-y-0.5">
                {item.selectedVariants.map((v: any, i: number) => (
                  <li key={i} className="text-sm" style={{ color: "rgba(255,247,234,0.5)" }}>
                    — {v.optionName ?? v.groupName ?? JSON.stringify(v)}
                  </li>
                ))}
              </ul>
            )}
            {item.selectedAddons?.length > 0 && (
              <ul className="ml-4 mt-0.5 space-y-0.5">
                {item.selectedAddons.map((a: any, i: number) => (
                  <li key={i} className="text-sm" style={{ color: "rgba(255,247,234,0.5)" }}>
                    + {a.optionName ?? a.name ?? JSON.stringify(a)}
                  </li>
                ))}
              </ul>
            )}
            {item.note && (
              <p className="ml-4 mt-0.5 text-xs italic" style={{ color: "var(--mango)" }}>"{item.note}"</p>
            )}
          </div>
        ))}
        {order.note && (
          <p className="text-sm italic pt-3 border-t" style={{ color: "var(--mango)", borderColor: "rgba(255,169,48,0.2)" }}>
            Note: "{order.note}"
          </p>
        )}
      </div>

      {/* Action */}
      <div className="px-5 pb-5 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {order.status === "PENDING" && (
          <button disabled={isPending} onClick={() => onStatusChange("CONFIRMED")}
            className="w-full py-3 rounded-xl font-black text-lg transition-all disabled:opacity-50"
            style={{ background: "var(--lime)", color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}>
            ✓ Accept
          </button>
        )}
        {order.status === "CONFIRMED" && (
          <button disabled={isPending} onClick={() => onStatusChange("PREPARING")}
            className="w-full py-3 rounded-xl font-black text-lg transition-all disabled:opacity-50"
            style={{ background: "var(--mango)", color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}>
            🍳 Cooking
          </button>
        )}
        {order.status === "PREPARING" && (
          <button disabled={isPending} onClick={() => onStatusChange("READY")}
            className="w-full py-3 rounded-xl font-black text-lg transition-all disabled:opacity-50"
            style={{ background: "var(--chili)", color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}>
            ✓ Done
          </button>
        )}
      </div>
    </div>
  );
}
