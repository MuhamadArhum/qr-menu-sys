"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  basePrice: string;
  quantity: number;
  selectedVariants: any[];
  selectedAddons: any[];
  itemTotal: string;
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

const LIVE_TABS = ["ALL", "PENDING", "CONFIRMED", "PREPARING", "READY"] as const;
const HISTORY_TABS = ["SERVED", "CANCELLED"] as const;

const STATUS_META: Record<string, { label: string; dot: string; pill: string; pillText: string }> = {
  PENDING:   { label: "Pending",   dot: "#FF4630", pill: "var(--chili-10)",       pillText: "var(--chili)"  },
  CONFIRMED: { label: "Confirmed", dot: "#3B82F6", pill: "#3b82f61a",             pillText: "#3B82F6"       },
  PREPARING: { label: "Preparing", dot: "#FFA930", pill: "rgba(255,169,48,0.12)", pillText: "var(--mango)"  },
  READY:     { label: "Ready",     dot: "#8FA300", pill: "rgba(143,163,0,0.12)",  pillText: "var(--lime)"   },
  SERVED:    { label: "Served",    dot: "#10B981", pill: "rgba(16,185,129,0.12)", pillText: "#10B981"       },
  CANCELLED: { label: "Cancelled", dot: "#9CA3AF", pill: "var(--char-08)",        pillText: "var(--char-60)"},
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 45_000;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const [viewMode, setViewMode] = useState<"live" | "history">("live");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [historyTab, setHistoryTab] = useState<"SERVED" | "CANCELLED">("SERVED");

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  // Live orders query
  const liveParams = new URLSearchParams();
  if (branchId) liveParams.set("branchId", branchId);
  if (statusTab !== "ALL") liveParams.set("status", statusTab);
  const liveQs = liveParams.toString() ? `?${liveParams.toString()}` : "";

  const { data: liveOrders = [], isLoading: liveLoading, refetch: refetchLive } = useQuery<Order[]>({
    queryKey: ["orders", "live", branchId, statusTab],
    queryFn: () => api.get<Order[]>(`/orders${liveQs}`),
    refetchInterval: viewMode === "live" ? 10_000 : false,
    enabled: viewMode === "live",
  });

  // History orders query
  const histParams = new URLSearchParams();
  histParams.set("status", historyTab);
  if (branchId) histParams.set("branchId", branchId);

  const { data: historyOrders = [], isLoading: historyLoading } = useQuery<Order[]>({
    queryKey: ["orders", "history", branchId, historyTab],
    queryFn: () => api.get<Order[]>(`/orders?${histParams.toString()}`),
    enabled: viewMode === "history",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (viewMode !== "live") return;
    const id = setInterval(() => refetchLive(), 10_000);
    return () => clearInterval(id);
  }, [refetchLive, viewMode]);

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const orders = viewMode === "live" ? liveOrders : historyOrders;
  const isLoading = viewMode === "live" ? liveLoading : historyLoading;

  const statusCounts = liveOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const activeCount = liveOrders.filter(o => o.status !== "SERVED" && o.status !== "CANCELLED").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
              {viewMode === "live" ? "Live Orders" : "Order History"}
            </h1>
            {viewMode === "live" && activeCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "var(--chili)", color: "#fff", fontFamily: "JetBrains Mono, monospace" }}>
                {activeCount} active
              </span>
            )}
          </div>
          {viewMode === "live" ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--lime)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--lime)" }} />
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--lime)" }}>Live</span>
              <span className="text-xs" style={{ color: "var(--char-60)" }}>· refreshes every 10s</span>
            </div>
          ) : (
            <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>Served and cancelled orders</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            className="pl-4 pr-8 py-2 text-sm font-medium rounded-xl focus:outline-none appearance-none cursor-pointer"
            style={{ background: "var(--cream)", border: "1.5px solid var(--char-15)", color: "var(--char)", fontFamily: "Work Sans, sans-serif" }}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Live / History toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--char-15)" }}>
            <button onClick={() => setViewMode("live")}
              className="px-4 py-2 text-sm font-semibold transition-all"
              style={viewMode === "live"
                ? { background: "var(--char)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--char-60)" }}>
              Live
            </button>
            <button onClick={() => setViewMode("history")}
              className="px-4 py-2 text-sm font-semibold transition-all"
              style={viewMode === "history"
                ? { background: "var(--char)", color: "#fff" }
                : { background: "var(--paper)", color: "var(--char-60)" }}>
              History
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {viewMode === "live" ? (
          LIVE_TABS.map(tab => {
            const active = statusTab === tab;
            const count = tab === "ALL" ? liveOrders.length : (statusCounts[tab] ?? 0);
            const meta = STATUS_META[tab];
            return (
              <button key={tab} onClick={() => setStatusTab(tab)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border"
                style={active
                  ? { background: tab === "ALL" ? "var(--char)" : (meta?.dot ?? "var(--char)"), color: "#fff", borderColor: "transparent" }
                  : { background: "var(--paper)", color: "var(--char-60)", borderColor: "var(--char-15)" }}>
                {tab === "PENDING" && active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
                {tab === "ALL" ? "All" : (STATUS_META[tab]?.label ?? tab)}
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold"
                  style={active
                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                    : { background: "var(--char-08)", color: "var(--char-60)", fontFamily: "JetBrains Mono, monospace" }}>
                  {count}
                </span>
              </button>
            );
          })
        ) : (
          HISTORY_TABS.map(tab => {
            const active = historyTab === tab;
            const meta = STATUS_META[tab]!;
            return (
              <button key={tab} onClick={() => setHistoryTab(tab)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border"
                style={active
                  ? { background: meta.dot, color: "#fff", borderColor: "transparent" }
                  : { background: "var(--paper)", color: "var(--char-60)", borderColor: "var(--char-15)" }}>
                {meta.label}
              </button>
            );
          })
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--cream)", border: "1.5px solid var(--char-15)" }}>
              <div className="h-6 rounded-lg w-1/3 mb-3" style={{ background: "var(--char-10)" }} />
              <div className="h-4 rounded w-1/2 mb-2" style={{ background: "var(--char-10)" }} />
              <div className="h-4 rounded w-3/4" style={{ background: "var(--char-10)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6 rounded-2xl"
          style={{ background: "var(--cream)", border: "1.5px dashed var(--char-20)" }}>
          <div className="text-5xl mb-4">{viewMode === "history" ? "📋" : "🛒"}</div>
          <h3 className="text-lg font-black mb-1" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            {viewMode === "history" ? "No order history yet" : "No orders right now"}
          </h3>
          <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--char-60)" }}>
            {viewMode === "history"
              ? `No ${STATUS_META[historyTab]?.label.toLowerCase()} orders found.`
              : statusTab === "ALL" ? "New orders will appear here." : `No ${STATUS_META[statusTab]?.label ?? statusTab} orders.`}
          </p>
          {viewMode === "live" && (
            <button onClick={() => refetchLive()} className="btn-primary px-6 py-2.5">↻ Refresh</button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <OrderTicket key={order.id} order={order} isPending={isPending} readOnly={viewMode === "history"}
              onStatusChange={status => updateStatus({ id: order.id, status })} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderTicket({ order, isPending, readOnly, onStatusChange }: {
  order: Order; isPending: boolean; readOnly: boolean; onStatusChange: (s: string) => void;
}) {
  const newOrder = order.status === "PENDING" && isNew(order.createdAt);
  const meta = STATUS_META[order.status] ?? { label: order.status, dot: "#9CA3AF", pill: "var(--char-08)", pillText: "var(--char-60)" };

  return (
    <div className="rounded-2xl flex flex-col overflow-hidden transition-all"
      style={{
        background: "var(--paper)",
        border: newOrder ? `2px solid var(--chili)` : `1.5px solid var(--char-15)`,
        boxShadow: newOrder ? "0 0 0 4px var(--chili-10)" : "none",
      }}>

      <div className="h-1 w-full" style={{ background: meta.dot }} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2 border-b border-dashed" style={{ borderColor: "var(--char-15)" }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
                style={{ background: "var(--char)", color: "var(--cream)", fontFamily: "JetBrains Mono, monospace" }}>
                TABLE
              </div>
              <span className="text-2xl font-black leading-none" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
                {order.table.label}
              </span>
            </div>
            {newOrder && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
                style={{ background: "var(--chili)", color: "#fff" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                New
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--char-60)" }}>{order.branch.name}</p>
          <p className="text-[11px]" style={{ color: "var(--char-60)", fontFamily: "JetBrains Mono, monospace" }}>
            #{order.id.slice(-6).toUpperCase()} · {timeAgo(order.createdAt)}
          </p>
        </div>
        <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: meta.pill, color: meta.pillText }}>
          {meta.label}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 py-3 flex-1 space-y-2.5">
        {order.items.map(item => {
          const variants: any[] = item.selectedVariants ?? [];
          const addons: any[] = item.selectedAddons ?? [];
          const mods = [
            ...variants.map((v: any) => v?.optionName ?? v?.name ?? v),
            ...addons.map((a: any) => a?.optionName ?? a?.name ?? a),
          ].filter(Boolean);
          return (
            <div key={item.id} className="flex items-start gap-2.5">
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black text-white mt-0.5"
                style={{ background: "var(--char)", fontFamily: "JetBrains Mono, monospace" }}>
                {item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                  {item.menuItemName}
                </p>
                {mods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {mods.map((m, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: "var(--char-08)", color: "var(--char-60)" }}>
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {item.note && <p className="text-[11px] italic mt-0.5" style={{ color: "var(--mango)" }}>"{item.note}"</p>}
              </div>
            </div>
          );
        })}
        {order.note && (
          <p className="text-xs italic pt-2 border-t" style={{ color: "var(--mango)", borderColor: "rgba(255,169,48,0.2)" }}>
            Note: "{order.note}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-3 border-t" style={{ borderColor: "var(--char-15)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--char-60)" }}>Total</span>
          <span className="text-xl font-black" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--char)" }}>
            {parseFloat(order.totalAmount).toFixed(2)}
          </span>
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-2">
            {order.status === "PENDING" && (
              <div className="flex gap-2">
                <button disabled={isPending} onClick={() => onStatusChange("CONFIRMED")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 text-white"
                  style={{ background: "var(--lime)", fontFamily: "Space Grotesk, sans-serif" }}>
                  ✓ Confirm
                </button>
                <button disabled={isPending} onClick={() => onStatusChange("CANCELLED")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: "var(--chili-10)", color: "var(--chili)", border: "1.5px solid var(--chili-20)", fontFamily: "Space Grotesk, sans-serif" }}>
                  ✕ Cancel
                </button>
              </div>
            )}
            {order.status === "CONFIRMED" && (
              <button disabled={isPending} onClick={() => onStatusChange("PREPARING")}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 text-white"
                style={{ background: "var(--mango)", fontFamily: "Space Grotesk, sans-serif" }}>
                🍳 Start Cooking
              </button>
            )}
            {order.status === "PREPARING" && (
              <button disabled={isPending} onClick={() => onStatusChange("READY")}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 text-white"
                style={{ background: "var(--lime)", fontFamily: "Space Grotesk, sans-serif" }}>
                ✓ Mark Ready
              </button>
            )}
            {order.status === "READY" && (
              <button disabled={isPending} onClick={() => onStatusChange("SERVED")}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: "var(--char-08)", color: "var(--char-60)", border: "1.5px solid var(--char-15)", fontFamily: "Space Grotesk, sans-serif" }}>
                🍽 Mark Served
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
