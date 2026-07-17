"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

interface Restaurant {
  id: string;
  displayName: string;
  legalName: string;
  status: string;
  createdAt: string;
  subscription: { status: string; plan: { name: string } } | null;
}

interface PaginatedRestaurants {
  data: Restaurant[];
  meta: { total: number; page: number; totalPages: number };
}

const createSchema = z.object({
  legalName: z.string().min(2, "Min 2 characters").max(100),
  displayName: z.string().min(2, "Min 2 characters").max(60),
  adminEmail: z.string().email("Invalid email"),
  adminPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, "Must contain a letter and a number"),
});

type CreateForm = z.infer<typeof createSchema>;

export default function RestaurantsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["restaurants", page, search],
    queryFn: () =>
      api.get<PaginatedRestaurants>(
        `/restaurants?page=${page}&limit=20${search ? `&search=${search}` : ""}`,
      ),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/restaurants/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast.success("Restaurant approved");
    },
    onError: () => toast.error("Failed to approve"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/restaurants/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast.success("Status updated");
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) => api.post("/restaurants", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast.success("Restaurant created successfully");
      setShowModal(false);
      reset();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to create restaurant";
      toast.error(msg);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-amber-100 text-amber-700",
    ARCHIVED: "bg-zinc-100 text-zinc-500",
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Restaurants</h1>
          <p className="text-zinc-500 text-sm">All registered tenants</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search…"
            className="input w-48"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button className="btn-primary px-4 py-2 text-sm" onClick={() => setShowModal(true)}>
            + Create Restaurant
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-zinc-400">Loading…</div>
      ) : !data || data.data.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-zinc-500">No restaurants found.</p></div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Restaurant</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.data.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.displayName}</p>
                      <p className="text-xs text-zinc-400">{r.legalName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {r.subscription?.plan.name ?? "No plan"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {r.status === "INACTIVE" && (
                          <button
                            className="text-xs font-semibold"
                            onClick={() => approveMutation.mutate(r.id)}
                          >
                            Approve
                          </button>
                        )}
                        {r.status === "ACTIVE" && (
                          <button
                            className="text-xs text-amber-500 hover:text-amber-700"
                            onClick={() => statusMutation.mutate({ id: r.id, status: "INACTIVE" })}
                          >
                            Suspend
                          </button>
                        )}
                        <Link href={`/restaurants/${r.id}`} className="text-xs text-zinc-400 hover:text-zinc-700">
                          Manage →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-zinc-500">{data.meta.total} restaurants</p>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <button className="btn-secondary py-1.5 text-xs" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Restaurant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Create Restaurant</h2>
              <button
                onClick={() => { setShowModal(false); reset(); }}
                className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="label">Legal Name</label>
                <input type="text" placeholder="Pizza Palace Pvt Ltd" className="input" {...register("legalName")} />
                {errors.legalName && <p className="text-red-500 text-xs mt-1">{errors.legalName.message}</p>}
              </div>

              <div>
                <label className="label">Display Name</label>
                <input type="text" placeholder="Pizza Palace" className="input" {...register("displayName")} />
                {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>}
              </div>

              <div>
                <label className="label">Admin Email</label>
                <input type="email" placeholder="owner@restaurant.com" className="input" {...register("adminEmail")} />
                {errors.adminEmail && <p className="text-red-500 text-xs mt-1">{errors.adminEmail.message}</p>}
              </div>

              <div>
                <label className="label">Admin Password</label>
                <input type="password" placeholder="••••••••" className="input" {...register("adminPassword")} />
                {errors.adminPassword && <p className="text-red-500 text-xs mt-1">{errors.adminPassword.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset(); }}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1 py-2.5"
                >
                  {createMutation.isPending ? "Creating…" : "Create Restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
