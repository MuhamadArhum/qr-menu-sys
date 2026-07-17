"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Props {
  params: Promise<{ id: string }>;
}

interface Restaurant {
  id: string;
  displayName: string;
  legalName: string;
  status: string;
  defaultCurrency: string;
  createdAt: string;
  _count: {
    branches: number;
    categories: number;
    users: number;
  };
  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    plan: { name: string; billingCycle: string };
  } | null;
}

interface Plan {
  id: string;
  name: string;
  billingCycle: string;
  price: string;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    INACTIVE: "bg-zinc-100 text-zinc-500 border border-zinc-200",
    SUSPENDED: "bg-red-50 text-red-600 border border-red-200",
    CANCELLED: "bg-red-50 text-red-500 border border-red-200",
    PENDING: "bg-amber-50 text-amber-600 border border-amber-200",
    EXPIRED: "bg-orange-50 text-orange-600 border border-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-zinc-100 text-zinc-500 border border-zinc-200"
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  border,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  color: string;
  border: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${color} ${border}`}>
        {icon}
      </div>
      <div>
        {value === undefined ? (
          <div className="h-6 w-10 bg-zinc-100 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-2xl font-bold text-zinc-900 leading-none">{value.toLocaleString()}</div>
        )}
        <div className="text-xs text-zinc-500 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

export default function RestaurantDetailPage({ params }: Props) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [subForm, setSubForm] = useState({ planId: "", startDate: "", endDate: "" });
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => api.get<Restaurant>(`/restaurants/${id}`),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/plans"),
  });

  const assignMutation = useMutation({
    mutationFn: () => api.post(`/restaurants/${id}/subscription`, subForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", id] });
      toast.success("Subscription assigned");
      setSubForm({ planId: "", startDate: "", endDate: "" });
    },
    onError: () => toast.error("Failed to assign subscription"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/restaurants/${id}/subscription/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", id] });
      toast.success("Subscription cancelled");
      setConfirmCancel(false);
    },
    onError: () => {
      toast.error("Failed to cancel subscription");
      setConfirmCancel(false);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-5 w-28 bg-zinc-100 rounded animate-pulse" />
        <div className="h-8 w-64 bg-zinc-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-zinc-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-zinc-400">Restaurant not found.</div>
    );
  }

  const sub = restaurant.subscription;
  const canCancel = sub?.status === "ACTIVE";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/restaurants"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Restaurants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">{restaurant.displayName}</h1>
          <div className="flex items-center gap-2.5 mt-1.5">
            <span className="text-sm text-zinc-400">{restaurant.legalName}</span>
            <span className="text-zinc-200">·</span>
            {statusBadge(restaurant.status)}
          </div>
        </div>
      </div>

      {/* Count stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Branches"
          value={restaurant._count?.branches}
          color="bg-violet-50 text-violet-600"
          border="border-violet-100"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          }
        />
        <StatCard
          label="Menu Categories"
          value={restaurant._count?.categories}
          color="bg-amber-50 text-amber-600"
          border="border-amber-100"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          }
        />
        <StatCard
          label="Staff Members"
          value={restaurant._count?.users}
          color="bg-sky-50 text-sky-600"
          border="border-sky-100"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
      </div>

      {/* Restaurant info */}
      <div className="card p-5">
        <h2 className="font-semibold text-zinc-900 mb-4">Restaurant Info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Default Currency</dt>
            <dd className="font-medium text-zinc-900 mt-0.5">{restaurant.defaultCurrency}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Account Status</dt>
            <dd className="mt-0.5">{statusBadge(restaurant.status)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Member Since</dt>
            <dd className="font-medium text-zinc-900 mt-0.5">
              {new Date(restaurant.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Restaurant ID</dt>
            <dd className="font-mono text-xs text-zinc-400 mt-0.5 truncate" title={restaurant.id}>
              {restaurant.id}
            </dd>
          </div>
        </dl>
      </div>

      {/* Subscription */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900">Subscription</h2>
          {sub && statusBadge(sub.status)}
        </div>

        {sub ? (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
              <div>
                <dt className="text-zinc-500">Plan</dt>
                <dd className="font-medium text-zinc-900 mt-0.5">{sub.plan.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Billing Cycle</dt>
                <dd className="font-medium text-zinc-900 mt-0.5 capitalize">
                  {sub.plan.billingCycle.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Start Date</dt>
                <dd className="font-medium text-zinc-900 mt-0.5">
                  {new Date(sub.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">End Date</dt>
                <dd className="font-medium text-zinc-900 mt-0.5">
                  {new Date(sub.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            {canCancel && (
              <div className="border-t border-zinc-100 pt-4">
                {confirmCancel ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-zinc-600 flex-1">
                      Are you sure you want to cancel this subscription?
                    </p>
                    <button
                      className="btn-secondary text-xs py-1.5 px-3"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelMutation.isPending}
                    >
                      No, keep it
                    </button>
                    <button
                      className="btn-danger text-xs py-1.5 px-3"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-danger"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-400 text-sm">No subscription assigned yet.</p>
        )}
      </div>

      {/* Assign / Update Subscription */}
      <div className="card p-5">
        <h2 className="font-semibold text-zinc-900 mb-4">Assign / Update Subscription</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Plan</label>
            <select
              className="input"
              value={subForm.planId}
              onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
            >
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.billingCycle} — {parseFloat(p.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={subForm.startDate}
                onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={subForm.endDate}
                onChange={(e) => setSubForm({ ...subForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={
              !subForm.planId ||
              !subForm.startDate ||
              !subForm.endDate ||
              assignMutation.isPending
            }
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending ? "Saving…" : "Assign Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}
