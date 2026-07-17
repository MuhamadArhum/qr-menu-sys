"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type StaffRole = "BRANCH_MANAGER" | "STAFF";
type StaffStatus = "ACTIVE" | "INACTIVE";

interface ManagedBranch {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  createdAt: string;
  managedBranches: ManagedBranch[];
}

interface AddStaffForm {
  email: string;
  password: string;
  role: StaffRole;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const fetchStaff = () => api.get<StaffMember[]>("/restaurants/me/staff");

const addStaff = (body: AddStaffForm) =>
  api.post<StaffMember>("/restaurants/me/staff", body);

const updateStaff = (id: string, body: { role?: StaffRole; status?: StaffStatus }) =>
  api.patch<StaffMember>(`/restaurants/me/staff/${id}`, body);

const deleteStaff = (id: string) =>
  api.delete<void>(`/restaurants/me/staff/${id}`);

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
  const styles: Record<StaffRole, string> = {
    BRANCH_MANAGER: "bg-blue-100 text-blue-700 border border-blue-200",
    STAFF: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  };
  const labels: Record<StaffRole, string> = {
    BRANCH_MANAGER: "Branch Manager",
    STAFF: "Staff",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: StaffStatus }) {
  const styles: Record<StaffStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700 border border-green-200",
    INACTIVE: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-9 h-9 rounded-full bg-zinc-200" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-zinc-200 rounded w-48" />
                <div className="h-3 bg-zinc-100 rounded w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-zinc-100 rounded-lg" />
              <div className="h-7 w-16 bg-zinc-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-3xl mb-4">
        👥
      </div>
      <h3 className="text-base font-semibold text-zinc-900 mb-1">No staff members yet</h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs">
        Add branch managers and staff to give them access to manage your restaurant.
      </p>
      <button onClick={onAdd} className="btn-primary">
        Add Staff Member
      </button>
    </div>
  );
}

// ─── Add Staff Form ───────────────────────────────────────────────────────────

interface AddStaffFormPanelProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddStaffFormPanel({ onClose, onSuccess }: AddStaffFormPanelProps) {
  const [form, setForm] = useState<AddStaffForm>({
    email: "",
    password: "",
    role: "STAFF",
  });

  const mutation = useMutation({
    mutationFn: addStaff,
    onSuccess: () => {
      toast.success("Staff member added successfully");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to add staff member");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Email and password are required");
      return;
    }
    mutation.mutate(form);
  }

  return (
    <div className="card mb-6 border-brand-200 bg-brand-50/30">
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">Add Staff Member</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="staff-email">
              Email address
            </label>
            <input
              id="staff-email"
              type="email"
              className="input"
              placeholder="staff@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="staff-password">
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              className="input"
              placeholder="Temporary password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
        </div>
        <div className="max-w-xs">
          <label className="label" htmlFor="staff-role">
            Role
          </label>
          <select
            id="staff-role"
            className="input"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
          >
            <option value="STAFF">Staff</option>
            <option value="BRANCH_MANAGER">Branch Manager</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save Staff Member"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Staff Row ────────────────────────────────────────────────────────────────

interface StaffRowProps {
  member: StaffMember;
}

function StaffRow({ member }: StaffRowProps) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () =>
      updateStaff(member.id, {
        status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      toast.success(
        `Staff member ${member.status === "ACTIVE" ? "deactivated" : "activated"} successfully`
      );
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update staff status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStaff(member.id),
    onSuccess: () => {
      toast.success("Staff member removed");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to remove staff member");
    },
  });

  function handleDelete() {
    if (
      window.confirm(
        `Are you sure you want to remove ${member.email}? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate();
    }
  }

  const initials = member.email.slice(0, 2).toUpperCase();
  const avatarColors: Record<StaffRole, string> = {
    BRANCH_MANAGER: "bg-blue-100 text-blue-700",
    STAFF: "bg-zinc-100 text-zinc-600",
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-150">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColors[member.role]}`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{member.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <RoleBadge role={member.role} />
              <StatusBadge status={member.status} />
            </div>
            {member.managedBranches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {member.managedBranches.map((branch) => (
                  <span
                    key={branch.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-50 text-zinc-600 border border-zinc-200"
                  >
                    ⊞ {branch.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || deleteMutation.isPending}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
            title={member.status === "ACTIVE" ? "Deactivate" : "Activate"}
          >
            {toggleMutation.isPending
              ? "…"
              : member.status === "ACTIVE"
              ? "Deactivate"
              : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending || toggleMutation.isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Remove staff member"
          >
            {deleteMutation.isPending ? "…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: staff, isLoading, isError, error } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  });

  function handleAddSuccess() {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  }

  const activeCount = staff?.filter((s) => s.status === "ACTIVE").length ?? 0;
  const managerCount = staff?.filter((s) => s.role === "BRANCH_MANAGER").length ?? 0;

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Staff Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage your restaurant staff and branch managers
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            + Add Staff Member
          </button>
        )}
      </div>

      {/* Stats strip (only when data is loaded) */}
      {staff && staff.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-zinc-900">{staff.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Total Staff</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Active</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-blue-700">{managerCount}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Branch Managers</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <AddStaffFormPanel
          onClose={() => setShowForm(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="card border-red-200 bg-red-50 text-center py-10">
          <p className="text-sm font-medium text-red-700">
            {(error as Error)?.message ?? "Failed to load staff"}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["staff"] })}
            className="btn-secondary mt-3 text-xs"
          >
            Retry
          </button>
        </div>
      ) : staff && staff.length === 0 && !showForm ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {staff?.map((member) => (
            <StaffRow key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
