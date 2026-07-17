"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Table {
  id: string;
  label: string;
  capacity: number | null;
  status: string;
  qrCodes: { id: string; codeValue: string; status: string }[];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function TablesPage({ params }: Props) {
  const { id: branchId } = use(params);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", capacity: "" });
  const [bulkForm, setBulkForm] = useState({ prefix: "T", from: "1", to: "10", capacity: "" });
  const [showBulk, setShowBulk] = useState(false);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: () => api.get<Table[]>(`/branches/${branchId}/tables`),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(`/branches/${branchId}/tables`, {
        label: form.label,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", branchId] });
      setForm({ label: "", capacity: "" });
      setShowForm(false);
      toast.success("Table created");
    },
    onError: () => toast.error("Failed to create table"),
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      api.post(`/branches/${branchId}/tables/bulk`, {
        prefix: bulkForm.prefix,
        from: parseInt(bulkForm.from),
        to: parseInt(bulkForm.to),
        capacity: bulkForm.capacity ? parseInt(bulkForm.capacity) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", branchId] });
      setShowBulk(false);
      toast.success("Tables created");
    },
    onError: () => toast.error("Failed to bulk create"),
  });

  const regenMutation = useMutation({
    mutationFn: (tableId: string) => api.post(`/tables/${tableId}/qr-code/regenerate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", branchId] });
      toast.success("QR code regenerated");
    },
  });

  function downloadQR(tableId: string, format: string, label: string) {
    const token = localStorage.getItem("access_token");
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/v1";
    const url = `${base}/tables/${tableId}/qr-code/download?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${label}.${format}`;
    // Need auth header — open in new tab with token in query (simplest approach)
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => toast.error("Download failed"));
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tables & QR Codes</h1>
          <p className="text-zinc-500 text-sm">Manage tables and download QR codes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="btn-secondary">Bulk Create</button>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Table</button>
        </div>
      </div>

      {/* Single create */}
      {showForm && (
        <div className="card p-5 mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="label">Label *</label>
            <input className="input" placeholder="e.g. Table 1" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="w-32">
            <label className="label">Capacity</label>
            <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <button className="btn-primary" disabled={!form.label || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "…" : "Save"}
          </button>
          <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}

      {/* Bulk create */}
      {showBulk && (
        <div className="card p-5 mb-4 space-y-3">
          <h3 className="font-semibold text-zinc-900">Bulk Create Tables</h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">Prefix</label>
              <input className="input w-24" value={bulkForm.prefix} onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })} />
            </div>
            <div>
              <label className="label">From #</label>
              <input type="number" className="input w-24" value={bulkForm.from} onChange={(e) => setBulkForm({ ...bulkForm, from: e.target.value })} />
            </div>
            <div>
              <label className="label">To #</label>
              <input type="number" className="input w-24" value={bulkForm.to} onChange={(e) => setBulkForm({ ...bulkForm, to: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input type="number" className="input w-24" value={bulkForm.capacity} onChange={(e) => setBulkForm({ ...bulkForm, capacity: e.target.value })} />
            </div>
            <button className="btn-primary" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
              {bulkMutation.isPending ? "Creating…" : "Create"}
            </button>
            <button className="btn-secondary" onClick={() => setShowBulk(false)}>Cancel</button>
          </div>
          <p className="text-xs text-zinc-400">Will create tables: {bulkForm.prefix}{bulkForm.from} … {bulkForm.prefix}{bulkForm.to}</p>
        </div>
      )}

      {/* Tables grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="card h-32 bg-zinc-100 animate-pulse" />)}</div>
      ) : tables.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-2">🪑</p>
          <p className="text-zinc-500">No tables yet. Add tables to generate QR codes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tables.map((table) => {
            const qr = table.qrCodes[0];
            return (
              <div key={table.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-900">{table.label}</span>
                  {table.capacity && <span className="text-xs text-zinc-400">Cap: {table.capacity}</span>}
                </div>

                {qr ? (
                  <>
                    <p className="text-xs text-zinc-400 mb-3 font-mono truncate">{qr.codeValue}</p>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => downloadQR(table.id, "png", table.label)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded">PNG</button>
                      <button onClick={() => downloadQR(table.id, "svg", table.label)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded">SVG</button>
                      <button onClick={() => downloadQR(table.id, "pdf", table.label)} className="text-xs bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded">PDF</button>
                      <button
        onClick={() => {
          if (confirm("Regenerate QR? Old QR code will be permanently invalidated."))
            regenMutation.mutate(table.id);
        }}
        className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1"
      >
        ↻ Regen
      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-red-400">No QR code</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
