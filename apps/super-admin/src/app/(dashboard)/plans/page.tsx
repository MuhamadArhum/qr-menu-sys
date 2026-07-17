"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  status: string;
  featureLimits: { maxBranches?: number; maxMenuItems?: number; maxTables?: number };
}

interface PlanForm {
  name: string;
  price: string;
  billingCycle: string;
  maxBranches: string;
  maxMenuItems: string;
  maxTables: string;
}

const CYCLES = ["TRIAL", "MONTHLY", "YEARLY", "ENTERPRISE"];

const EMPTY_FORM: PlanForm = {
  name: "",
  price: "",
  billingCycle: "MONTHLY",
  maxBranches: "1",
  maxMenuItems: "100",
  maxTables: "20",
};

function formFromPlan(plan: Plan): PlanForm {
  return {
    name: plan.name,
    price: plan.price,
    billingCycle: plan.billingCycle,
    maxBranches: String(plan.featureLimits?.maxBranches ?? 1),
    maxMenuItems: String(plan.featureLimits?.maxMenuItems ?? 100),
    maxTables: String(plan.featureLimits?.maxTables ?? 20),
  };
}

function buildPayload(form: PlanForm) {
  return {
    name: form.name,
    price: parseFloat(form.price),
    billingCycle: form.billingCycle,
    featureLimits: {
      maxBranches: parseInt(form.maxBranches),
      maxMenuItems: parseInt(form.maxMenuItems),
      maxTables: parseInt(form.maxTables),
    },
  };
}

interface PlanFormFieldsProps {
  form: PlanForm;
  onChange: (form: PlanForm) => void;
}

function PlanFormFields({ form, onChange }: PlanFormFieldsProps) {
  const set = (key: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Starter" />
        </div>
        <div>
          <label className="label">Price (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.price}
            onChange={set("price")}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label">Billing Cycle</label>
          <select className="input" value={form.billingCycle} onChange={set("billingCycle")}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Max Branches</label>
          <input type="number" min="1" className="input" value={form.maxBranches} onChange={set("maxBranches")} />
        </div>
        <div>
          <label className="label">Max Menu Items</label>
          <input type="number" min="1" className="input" value={form.maxMenuItems} onChange={set("maxMenuItems")} />
        </div>
        <div>
          <label className="label">Max Tables</label>
          <input type="number" min="1" className="input" value={form.maxTables} onChange={set("maxTables")} />
        </div>
      </div>
    </>
  );
}

export default function PlansPage() {
  const qc = useQueryClient();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PlanForm>(EMPTY_FORM);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlanForm>(EMPTY_FORM);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/plans"),
  });

  // --- Create ---
  const createMutation = useMutation({
    mutationFn: () => api.post("/plans", buildPayload(createForm)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      toast.success("Plan created");
    },
    onError: () => toast.error("Failed to create plan"),
  });

  // --- Edit ---
  const editMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/plans/${id}`, buildPayload(editForm)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setEditingId(null);
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });

  // --- Toggle status ---
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/plans/${id}`, { status }),
    onSuccess: (_data, { status }) => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success(status === "ACTIVE" ? "Plan activated" : "Plan deactivated");
    },
    onError: () => toast.error("Failed to update plan status"),
  });

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditForm(formFromPlan(plan));
    setShowCreate(false); // collapse create form while editing
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleToggle(plan: Plan) {
    if (plan.status === "ACTIVE") {
      const confirmed = window.confirm(
        `Deactivate "${plan.name}"? Existing subscribers will not be affected, but new signups will be blocked.`
      );
      if (!confirmed) return;
      toggleMutation.mutate({ id: plan.id, status: "INACTIVE" });
    } else {
      toggleMutation.mutate({ id: plan.id, status: "ACTIVE" });
    }
  }

  const isFormValid = (form: PlanForm) => form.name.trim() !== "" && form.price !== "" && parseFloat(form.price) >= 0;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Subscription Plans</h1>
          <p className="text-zinc-500 text-sm">Manage pricing tiers available to restaurants</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
            }}
            className="btn-primary"
          >
            + New Plan
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-zinc-900">New Plan</h2>
          <PlanFormFields form={createForm} onChange={setCreateForm} />
          <div className="flex gap-2 pt-1">
            <button
              className="btn-primary"
              disabled={!isFormValid(createForm) || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Save Plan"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowCreate(false);
                setCreateForm(EMPTY_FORM);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Plan list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-24 bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-500">No plans yet. Create your first plan above.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const isInactive = plan.status !== "ACTIVE";
            const isEditingThis = editingId === plan.id;
            const isToggling = toggleMutation.isPending && toggleMutation.variables?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`card overflow-hidden transition-opacity ${isInactive ? "opacity-60" : ""}`}
              >
                {/* Plan card header */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900">{plan.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          plan.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500 mt-0.5">
                      {plan.billingCycle} &middot; ${parseFloat(plan.price).toFixed(2)} / cycle
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                      {plan.featureLimits?.maxBranches !== undefined && (
                        <span>Branches: {plan.featureLimits.maxBranches}</span>
                      )}
                      {plan.featureLimits?.maxMenuItems !== undefined && (
                        <span>Menu items: {plan.featureLimits.maxMenuItems}</span>
                      )}
                      {plan.featureLimits?.maxTables !== undefined && (
                        <span>Tables: {plan.featureLimits.maxTables}</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => (isEditingThis ? cancelEdit() : startEdit(plan))}
                    >
                      {isEditingThis ? "Cancel Edit" : "Edit"}
                    </button>
                    <button
                      className="btn-secondary text-xs"
                      disabled={isToggling}
                      onClick={() => handleToggle(plan)}
                    >
                      {isToggling
                        ? "Saving…"
                        : plan.status === "ACTIVE"
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditingThis && (
                  <div className="border-t border-zinc-100 bg-zinc-50 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-700">Edit Plan</h3>
                    <PlanFormFields form={editForm} onChange={setEditForm} />
                    <div className="flex gap-2 pt-1">
                      <button
                        className="btn-primary"
                        disabled={!isFormValid(editForm) || editMutation.isPending}
                        onClick={() => editMutation.mutate(plan.id)}
                      >
                        {editMutation.isPending ? "Saving…" : "Save Changes"}
                      </button>
                      <button className="btn-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
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
