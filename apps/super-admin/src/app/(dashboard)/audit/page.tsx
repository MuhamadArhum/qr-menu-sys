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
  restaurant: { id: string; displayName: string } | null;
}

interface AuditResponse {
  data: AuditEntry[];
  meta: { total: number; page: number; totalPages: number };
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  ACTIVATE: "bg-emerald-100 text-emerald-700",
  SUSPEND: "bg-amber-100 text-amber-700",
  APPROVE: "bg-violet-100 text-violet-700",
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-all", page, entityType],
    queryFn: () =>
      api.get<AuditResponse>(
        `/audit?page=${page}&limit=30${entityType ? `&entityType=${entityType}` : ""}`,
      ),
  });

  const ENTITY_TYPES = ["Restaurant", "Branch", "Table", "Category", "MenuItem", "QRCode", "User"];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Audit Log</h1>
          <p className="text-zinc-500 text-sm">All platform activity across all tenants</p>
        </div>
        <select
          className="input w-44"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-zinc-400">Loading…</div>
      ) : !data || data.data.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-zinc-500">No audit entries found.</p></div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">When</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Actor</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Restaurant</th>
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
                    <td className="px-4 py-3 text-xs text-zinc-600">{entry.actor.email}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {entry.restaurant?.displayName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[entry.action] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <span className="font-medium">{entry.entityType}</span>
                      <span className="text-zinc-400 ml-1 font-mono">{entry.entityId.slice(0, 8)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-zinc-500">
                {data.meta.total} entries · Page {data.meta.page} of {data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <button className="btn-secondary py-1.5 text-xs" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
