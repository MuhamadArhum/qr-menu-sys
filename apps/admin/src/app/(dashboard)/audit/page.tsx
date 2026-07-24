"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  actor: { id: string; email: string; role: string };
}

interface AuditResponse {
  data: AuditEntry[];
  meta: { total: number; page: number; totalPages: number };
}

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api.get<AuditResponse>(`/audit/mine?page=${page}&limit=20`),
  });

  const ACTION_COLOR: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    ACTIVATE: "bg-emerald-100 text-emerald-700",
    SUSPEND: "bg-amber-100 text-amber-700",
    APPROVE: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Audit Log</h1>
        <p className="text-zinc-500 text-sm">All admin actions in your restaurant</p>
      </div>

      {isLoading ? (
        <div className="card overflow-hidden animate-pulse">
          <div className="bg-zinc-50 border-b border-zinc-100 flex gap-4 px-4 py-3">
            {[70, 140, 90, 110].map((w, i) => (
              <div key={i} className="h-3 rounded bg-zinc-200" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-zinc-100 last:border-0">
              <div className="h-3 w-24 rounded bg-zinc-100" />
              <div className="h-3 rounded bg-zinc-100" style={{ width: 110 + (i % 4) * 15 }} />
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
              <div className="h-3 w-20 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-500">No audit entries yet.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">When</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Actor</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.data.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{entry.actor.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[entry.action] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      <span className="font-medium">{entry.entityType}</span>
                      <span className="text-zinc-400 ml-1 font-mono">{entry.entityId.slice(0, 8)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-zinc-500">
                Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} entries
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button className="btn-secondary py-1.5 text-xs" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
