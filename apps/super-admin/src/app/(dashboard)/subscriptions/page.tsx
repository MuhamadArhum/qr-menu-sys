"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";

interface Subscription {
  id: string;
  restaurantId: string;
  status: string;
  startDate: string;
  endDate: string;
  plan: { name: string; billingCycle: string; price: string };
  restaurant: { displayName: string; legalName: string };
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  TRIAL: "bg-blue-100 text-blue-700",
};

const EXPIRING_SOON_DAYS = 30;

function isExpiringSoon(endDate: string, status: string): boolean {
  if (status !== "ACTIVE") return false;
  const threshold = new Date(Date.now() + EXPIRING_SOON_DAYS * 86_400_000);
  return new Date(endDate) < threshold;
}

export default function SubscriptionsPage() {
  const qc = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.get<Subscription[]>("/subscriptions"),
  });

  const cancelMutation = useMutation({
    mutationFn: (restaurantId: string) =>
      api.patch(`/restaurants/${restaurantId}/subscription/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription cancelled");
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });

  function handleCancel(sub: Subscription) {
    const confirmed = window.confirm(
      `Cancel subscription for "${sub.restaurant.displayName}"? This cannot be undone.`
    );
    if (!confirmed) return;
    cancelMutation.mutate(sub.restaurantId);
  }

  // Summary counts
  const activeCount = subs.filter((s) => s.status === "ACTIVE").length;
  const expiringSoonCount = subs.filter((s) => isExpiringSoon(s.endDate, s.status)).length;
  const expiredCount = subs.filter((s) => s.status === "EXPIRED").length;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Subscriptions</h1>
        <p className="text-zinc-500 text-sm">All restaurant subscriptions</p>
      </div>

      {/* Summary bar */}
      {!isLoading && subs.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-green-700 font-medium">{activeCount} active</span>
          <span className="text-zinc-300">&middot;</span>
          <span className={expiringSoonCount > 0 ? "text-amber-600 font-medium" : "text-zinc-400"}>
            {expiringSoonCount} expiring soon
          </span>
          <span className="text-zinc-300">&middot;</span>
          <span className="text-zinc-400">{expiredCount} expired</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="card p-8 text-center text-zinc-400">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-500 text-lg mb-1">No subscriptions yet</p>
          <p className="text-zinc-400 text-sm">Subscriptions will appear here once restaurants sign up.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Restaurant</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {subs.map((sub) => {
                const expiring = isExpiringSoon(sub.endDate, sub.status);
                const isCancelling =
                  cancelMutation.isPending && cancelMutation.variables === sub.restaurantId;

                return (
                  <tr
                    key={sub.id}
                    className={`hover:bg-zinc-50 transition-colors ${
                      sub.status === "CANCELLED" || sub.status === "EXPIRED" ? "opacity-60" : ""
                    }`}
                  >
                    {/* Restaurant */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{sub.restaurant.displayName}</p>
                      <p className="text-xs text-zinc-400">{sub.restaurant.legalName}</p>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-700">{sub.plan.name}</p>
                      <p className="text-xs text-zinc-400">
                        {sub.plan.billingCycle} &middot; ${parseFloat(sub.plan.price).toFixed(2)}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLOR[sub.status] ?? "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    {/* Expires */}
                    <td className="px-4 py-3">
                      <p
                        className={`text-sm ${
                          expiring ? "text-amber-600 font-medium" : "text-zinc-500"
                        }`}
                      >
                        {new Date(sub.endDate).toLocaleDateString()}
                        {expiring && (
                          <span
                            className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"
                            title="Expiring within 30 days"
                          >
                            Soon
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {sub.status === "ACTIVE" && (
                          <button
                            className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"
                            disabled={isCancelling}
                            onClick={() => handleCancel(sub)}
                          >
                            {isCancelling ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                        <Link
                          href={`/restaurants/${sub.restaurantId}`}
                          className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--chili)" }}
                        >
                          Manage →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
