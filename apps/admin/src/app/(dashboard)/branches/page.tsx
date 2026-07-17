"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, uploadFile } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

interface Manager { id: string; email: string }

interface Branch {
  id: string;
  name: string;
  address: string;
  contactNumber: string | null;
  logoUrl: string | null;
  status: string;
  managers: Manager[];
  _count?: { tables: number };
}

interface StaffMember { id: string; email: string; role: string; status: string }

export default function BranchesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", contactNumber: "" });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetBranchId = useRef<string | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<StaffMember[]>("/restaurants/me/staff"),
  });

  const branchManagers = staff.filter((s) => s.role === "BRANCH_MANAGER" && s.status === "ACTIVE");

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/branches", {
        name: form.name,
        address: form.address,
        contactNumber: form.contactNumber || undefined,
        businessHours: defaultBusinessHours(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setForm({ name: "", address: "", contactNumber: "" });
      setShowForm(false);
      toast.success("Branch created");
    },
    onError: () => toast.error("Failed to create branch"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const action = status === "ACTIVE" ? "deactivate" : "activate";
      return api.patch(`/branches/${id}/${action}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch updated");
    },
  });

  const assignManagerMutation = useMutation({
    mutationFn: ({ branchId, managerId }: { branchId: string; managerId: string }) =>
      api.post(`/branches/${branchId}/manager`, { managerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Manager assigned");
    },
    onError: () => toast.error("Failed to assign manager"),
  });

  const removeManagerMutation = useMutation({
    mutationFn: ({ branchId, managerId }: { branchId: string; managerId: string }) =>
      api.delete(`/branches/${branchId}/manager/${managerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Manager removed");
    },
    onError: () => toast.error("Failed to remove manager"),
  });

  function toggleManagers(id: string) {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openLogoUpload(branchId: string) {
    targetBranchId.current = branchId;
    fileInputRef.current?.click();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const branchId = targetBranchId.current;
    if (!file || !branchId) return;
    e.target.value = "";
    setUploadingId(branchId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadFile<{ url: string; publicId: string; thumbnailUrl: string }>(
        "/storage/upload?folder=branches", fd,
      );
      await api.patch(`/branches/${branchId}`, { logoUrl: url });
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Logo updated");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />

      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage your locations and tables</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Branch</button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--char)" }}>New Branch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label">Branch Name *</label>
              <input className="input" placeholder="e.g. Downtown Location"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input className="input" placeholder="e.g. +1 555 000 0000"
                value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="label">Address *</label>
              <input className="input" placeholder="Full street address"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={!form.name || !form.address || createMutation.isPending}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Saving…" : "Save Branch"}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Branch List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl flex-shrink-0" style={{ background: "var(--char-08)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded-lg w-1/3" style={{ background: "var(--char-08)" }} />
                <div className="h-3 rounded-lg w-2/3" style={{ background: "var(--char-08)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,70,48,0.08)" }}>
            <svg className="w-8 h-8" fill="none" stroke="var(--chili)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>No branches yet</h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--char-60)" }}>
            Add your first branch location to get started with tables and QR codes.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Branch</button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => {
            const managersOpen = expandedManagers.has(branch.id);
            const assignedIds = new Set(branch.managers.map((m) => m.id));
            const available = branchManagers.filter((m) => !assignedIds.has(m.id));

            return (
              <div key={branch.id} className="card overflow-hidden">
                {/* Main row */}
                <div className="p-5 flex items-center gap-4">
                  {/* Logo */}
                  <button
                    className="relative flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden group focus:outline-none"
                    onClick={() => openLogoUpload(branch.id)}
                    title="Click to upload branch logo"
                    style={{ border: "1.5px solid var(--char-15)" }}
                  >
                    {uploadingId === branch.id ? (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--char-08)" }}>
                        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "var(--chili)", borderTopColor: "transparent" }} />
                      </div>
                    ) : branch.logoUrl ? (
                      <>
                        <img src={branch.logoUrl} alt={branch.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(28,23,16,0.55)" }}>
                          <CameraIcon />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,70,48,0.08)" }}>
                          <span className="text-xl font-black uppercase" style={{ color: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}>
                            {branch.name.charAt(0)}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(28,23,16,0.45)" }}>
                          <CameraIcon />
                        </div>
                      </>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base leading-snug" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                      {branch.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--char-40)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm truncate" style={{ color: "var(--char-60)" }}>{branch.address}</span>
                    </div>
                    {branch.contactNumber && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--char-40)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-xs" style={{ color: "var(--char-60)" }}>{branch.contactNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {branch._count?.tables !== undefined && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--char-08)", color: "var(--char-60)" }}>
                          {branch._count.tables} {branch._count.tables === 1 ? "table" : "tables"}
                        </span>
                      )}
                      <button
                        onClick={() => toggleManagers(branch.id)}
                        className="text-xs px-2 py-0.5 rounded-full font-medium transition-colors"
                        style={managersOpen
                          ? { background: "rgba(255,70,48,0.1)", color: "var(--chili)" }
                          : { background: "var(--char-08)", color: "var(--char-60)" }}
                      >
                        {branch.managers.length} {branch.managers.length === 1 ? "manager" : "managers"}
                        <span className="ml-1">{managersOpen ? "▲" : "▼"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <span className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={branch.status === "ACTIVE"
                      ? { background: "rgba(143,163,0,0.1)", color: "var(--lime)" }
                      : { background: "var(--char-08)", color: "var(--char-60)" }}>
                    {branch.status === "ACTIVE" ? "Active" : branch.status.toLowerCase()}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/branches/${branch.id}/tables`} className="btn-primary text-xs py-2">
                      Tables &amp; QR
                    </Link>
                    <button
                      onClick={() => toggleMutation.mutate({ id: branch.id, status: branch.status })}
                      className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                      style={branch.status === "ACTIVE" ? { color: "var(--char-60)" } : { color: "var(--lime)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--char-08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                {/* Manager panel */}
                {managersOpen && (
                  <div className="border-t px-5 py-4" style={{ borderColor: "var(--char-08)", background: "var(--cream)" }}>
                    <p className="text-xs font-bold mb-3" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                      Branch Managers
                    </p>

                    {/* Assigned managers */}
                    {branch.managers.length === 0 ? (
                      <p className="text-xs mb-3" style={{ color: "var(--char-40)" }}>No managers assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {branch.managers.map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium"
                            style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)", color: "var(--char)" }}>
                            <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black"
                              style={{ background: "#3B82F6", color: "#fff" }}>
                              {m.email[0].toUpperCase()}
                            </span>
                            {m.email.split("@")[0]}
                            <button
                              onClick={() => removeManagerMutation.mutate({ branchId: branch.id, managerId: m.id })}
                              className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                              style={{ color: "var(--chili)" }}
                              title="Remove manager"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assign dropdown */}
                    {available.length > 0 && (
                      <div className="flex items-center gap-2">
                        <AssignManagerSelect
                          available={available}
                          onAssign={(managerId) => assignManagerMutation.mutate({ branchId: branch.id, managerId })}
                          isPending={assignManagerMutation.isPending}
                        />
                      </div>
                    )}
                    {available.length === 0 && branch.managers.length > 0 && (
                      <p className="text-xs" style={{ color: "var(--char-40)" }}>All branch managers are assigned.</p>
                    )}
                    {branchManagers.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--char-40)" }}>
                        No Branch Managers exist yet. Add them from the{" "}
                        <Link href="/staff" className="underline" style={{ color: "var(--chili)" }}>Staff page</Link>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssignManagerSelect({
  available,
  onAssign,
  isPending,
}: {
  available: StaffMember[];
  onAssign: (id: string) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState("");

  return (
    <>
      <select
        className="input text-sm py-1.5 flex-1 max-w-xs"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select a Branch Manager…</option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>{m.email}</option>
        ))}
      </select>
      <button
        className="btn-primary text-xs py-1.5"
        disabled={!selected || isPending}
        onClick={() => { onAssign(selected); setSelected(""); }}
      >
        {isPending ? "Assigning…" : "Assign"}
      </button>
    </>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function defaultBusinessHours() {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  return days.map((day) => ({ day, isOpen: day !== "SUN", shifts: [{ open: "09:00", close: "22:00" }] }));
}
