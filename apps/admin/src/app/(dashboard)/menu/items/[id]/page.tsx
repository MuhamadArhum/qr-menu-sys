"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  basePrice: string;
  categoryId: string;
  description: string | null;
}

interface VariantOption {
  id: string;
  name: string;
  priceModifier: string;
  sortOrder: number;
}

interface VariantGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: VariantOption[];
}

interface AddonOption {
  id: string;
  name: string;
  price: string;
  sortOrder: number;
}

interface AddonGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: AddonOption[];
}

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Default form states ──────────────────────────────────────────────────────

const DEFAULT_VARIANT_GROUP = {
  name: "",
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
};

const DEFAULT_ADDON_GROUP = {
  name: "",
  isRequired: false,
  minSelect: 0,
  maxSelect: 10,
};

const DEFAULT_VARIANT_OPTION = { name: "", priceModifier: "" };
const DEFAULT_ADDON_OPTION = { name: "", price: "" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function VariantSection({ itemId }: { itemId: string }) {
  const qc = useQueryClient();

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState(DEFAULT_VARIANT_GROUP);

  // Per-group option form: keyed by groupId
  const [optionForms, setOptionForms] = useState<
    Record<string, { name: string; priceModifier: string }>
  >({});

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["variant-groups", itemId],
    queryFn: () => api.get<VariantGroup[]>(`/menu-items/${itemId}/variant-groups`),
  });

  const createGroupMutation = useMutation({
    mutationFn: () =>
      api.post("/variant-groups", {
        menuItemId: itemId,
        name: groupForm.name,
        isRequired: groupForm.isRequired,
        minSelect: groupForm.minSelect,
        maxSelect: groupForm.maxSelect,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variant-groups", itemId] });
      setGroupForm(DEFAULT_VARIANT_GROUP);
      setShowGroupForm(false);
      toast.success("Variant group created");
    },
    onError: () => toast.error("Failed to create variant group"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.delete(`/variant-groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variant-groups", itemId] });
      toast.success("Variant group deleted");
    },
    onError: () => toast.error("Failed to delete variant group"),
  });

  const createOptionMutation = useMutation({
    mutationFn: ({ groupId, name, priceModifier }: { groupId: string; name: string; priceModifier: string }) =>
      api.post(`/variant-groups/${groupId}/options`, {
        name,
        priceModifier: priceModifier !== "" ? parseFloat(priceModifier) : undefined,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["variant-groups", itemId] });
      setOptionForms((prev) => ({ ...prev, [variables.groupId]: DEFAULT_VARIANT_OPTION }));
      toast.success("Option added");
    },
    onError: () => toast.error("Failed to add option"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: string) => api.delete(`/variant-options/${optionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variant-groups", itemId] });
      toast.success("Option deleted");
    },
    onError: () => toast.error("Failed to delete option"),
  });

  function getOptionForm(groupId: string) {
    return optionForms[groupId] ?? DEFAULT_VARIANT_OPTION;
  }

  function setOptionForm(groupId: string, patch: Partial<{ name: string; priceModifier: string }>) {
    setOptionForms((prev) => ({
      ...prev,
      [groupId]: { ...getOptionForm(groupId), ...patch },
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-zinc-900">Variant Groups</h2>
      <p className="text-sm text-zinc-500 -mt-2">
        Variants are mutually-exclusive choices (e.g. Size, Spice Level).
      </p>

      {isLoading ? (
        <div className="card p-6 text-center text-zinc-400 text-sm">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="card p-6 text-center text-zinc-400 text-sm">No variant groups yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const optForm = getOptionForm(group.id);
            return (
              <div key={group.id} className="card p-4">
                {/* Group header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900">{group.name}</span>
                    {group.isRequired ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Select {group.minSelect}–{group.maxSelect}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete variant group "${group.name}"? All its options will also be removed.`))
                        deleteGroupMutation.mutate(group.id);
                    }}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Delete group
                  </button>
                </div>

                {/* Existing options */}
                {group.options.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {group.options.map((opt) => {
                      const mod = parseFloat(opt.priceModifier);
                      const modLabel =
                        mod === 0 ? "" : mod > 0 ? `+PKR ${mod.toFixed(0)}` : `−PKR ${Math.abs(mod).toFixed(0)}`;
                      return (
                        <li
                          key={opt.id}
                          className="flex items-center justify-between text-sm text-zinc-700 bg-zinc-50 rounded px-3 py-1.5"
                        >
                          <span>
                            {opt.name}
                            {modLabel && (
                              <span className={`ml-2 text-xs ${mod >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {modLabel}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete option "${opt.name}"?`))
                                deleteOptionMutation.mutate(opt.id);
                            }}
                            className="text-red-400 hover:text-red-600 text-xs ml-3"
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Inline add-option form */}
                <div className="flex gap-2 items-end flex-wrap border-t border-zinc-100 pt-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="label">Option name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Large"
                      value={optForm.name}
                      onChange={(e) => setOptionForm(group.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <label className="label">Price modifier (PKR)</label>
                    <input
                      type="number"
                      step="1"
                      className="input"
                      placeholder="e.g. 50 or -10"
                      value={optForm.priceModifier}
                      onChange={(e) => setOptionForm(group.id, { priceModifier: e.target.value })}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    disabled={!optForm.name || createOptionMutation.isPending}
                    onClick={() =>
                      createOptionMutation.mutate({
                        groupId: group.id,
                        name: optForm.name,
                        priceModifier: optForm.priceModifier,
                      })
                    }
                  >
                    {createOptionMutation.isPending ? "Adding…" : "+ Add Option"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add group form */}
      {showGroupForm ? (
        <div className="card p-4 space-y-4">
          <h3 className="font-medium text-zinc-900">New Variant Group</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Group name *</label>
              <input
                className="input"
                placeholder="e.g. Size, Spice Level"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Min select</label>
              <input
                type="number"
                min={0}
                className="input"
                value={groupForm.minSelect}
                onChange={(e) => setGroupForm({ ...groupForm, minSelect: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Max select</label>
              <input
                type="number"
                min={1}
                className="input"
                value={groupForm.maxSelect}
                onChange={(e) => setGroupForm({ ...groupForm, maxSelect: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="vg-required"
                type="checkbox"
                checked={groupForm.isRequired}
                onChange={(e) => setGroupForm({ ...groupForm, isRequired: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-orange-500"
              />
              <label htmlFor="vg-required" className="text-sm text-zinc-700 cursor-pointer">
                Required (customer must select)
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!groupForm.name || createGroupMutation.isPending}
              onClick={() => createGroupMutation.mutate()}
            >
              {createGroupMutation.isPending ? "Saving…" : "Save Group"}
            </button>
            <button className="btn-secondary" onClick={() => { setShowGroupForm(false); setGroupForm(DEFAULT_VARIANT_GROUP); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary self-start" onClick={() => setShowGroupForm(true)}>
          + Add Variant Group
        </button>
      )}
    </div>
  );
}

function AddonSection({ itemId }: { itemId: string }) {
  const qc = useQueryClient();

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState(DEFAULT_ADDON_GROUP);

  const [optionForms, setOptionForms] = useState<
    Record<string, { name: string; price: string }>
  >({});

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["addon-groups", itemId],
    queryFn: () => api.get<AddonGroup[]>(`/menu-items/${itemId}/addon-groups`),
  });

  const createGroupMutation = useMutation({
    mutationFn: () =>
      api.post("/addon-groups", {
        menuItemId: itemId,
        name: groupForm.name,
        isRequired: groupForm.isRequired,
        minSelect: groupForm.minSelect,
        maxSelect: groupForm.maxSelect,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addon-groups", itemId] });
      setGroupForm(DEFAULT_ADDON_GROUP);
      setShowGroupForm(false);
      toast.success("Addon group created");
    },
    onError: () => toast.error("Failed to create addon group"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.delete(`/addon-groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addon-groups", itemId] });
      toast.success("Addon group deleted");
    },
    onError: () => toast.error("Failed to delete addon group"),
  });

  const createOptionMutation = useMutation({
    mutationFn: ({ groupId, name, price }: { groupId: string; name: string; price: string }) =>
      api.post(`/addon-groups/${groupId}/options`, {
        name,
        price: price !== "" ? parseFloat(price) : undefined,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["addon-groups", itemId] });
      setOptionForms((prev) => ({ ...prev, [variables.groupId]: DEFAULT_ADDON_OPTION }));
      toast.success("Option added");
    },
    onError: () => toast.error("Failed to add option"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: string) => api.delete(`/addon-options/${optionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addon-groups", itemId] });
      toast.success("Option deleted");
    },
    onError: () => toast.error("Failed to delete option"),
  });

  function getOptionForm(groupId: string) {
    return optionForms[groupId] ?? DEFAULT_ADDON_OPTION;
  }

  function setOptionForm(groupId: string, patch: Partial<{ name: string; price: string }>) {
    setOptionForms((prev) => ({
      ...prev,
      [groupId]: { ...getOptionForm(groupId), ...patch },
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-zinc-900">Addon Groups</h2>
      <p className="text-sm text-zinc-500 -mt-2">
        Addons are optional extras customers can stack (e.g. Extra Cheese, Dipping Sauces).
      </p>

      {isLoading ? (
        <div className="card p-6 text-center text-zinc-400 text-sm">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="card p-6 text-center text-zinc-400 text-sm">No addon groups yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const optForm = getOptionForm(group.id);
            return (
              <div key={group.id} className="card p-4">
                {/* Group header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900">{group.name}</span>
                    {group.isRequired ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Select {group.minSelect}–{group.maxSelect}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete addon group "${group.name}"? All its options will also be removed.`))
                        deleteGroupMutation.mutate(group.id);
                    }}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Delete group
                  </button>
                </div>

                {/* Existing options */}
                {group.options.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {group.options.map((opt) => {
                      const price = parseFloat(opt.price);
                      return (
                        <li
                          key={opt.id}
                          className="flex items-center justify-between text-sm text-zinc-700 bg-zinc-50 rounded px-3 py-1.5"
                        >
                          <span>
                            {opt.name}
                            {price > 0 && (
                              <span className="ml-2 text-xs text-emerald-600">+PKR {price.toFixed(0)}</span>
                            )}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete option "${opt.name}"?`))
                                deleteOptionMutation.mutate(opt.id);
                            }}
                            className="text-red-400 hover:text-red-600 text-xs ml-3"
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Inline add-option form */}
                <div className="flex gap-2 items-end flex-wrap border-t border-zinc-100 pt-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="label">Option name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Extra Cheese"
                      value={optForm.name}
                      onChange={(e) => setOptionForm(group.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <label className="label">Price (PKR)</label>
                    <input
                      type="number"
                      step="1"
                      min={0}
                      className="input"
                      placeholder="e.g. 30"
                      value={optForm.price}
                      onChange={(e) => setOptionForm(group.id, { price: e.target.value })}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    disabled={!optForm.name || createOptionMutation.isPending}
                    onClick={() =>
                      createOptionMutation.mutate({
                        groupId: group.id,
                        name: optForm.name,
                        price: optForm.price,
                      })
                    }
                  >
                    {createOptionMutation.isPending ? "Adding…" : "+ Add Option"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add group form */}
      {showGroupForm ? (
        <div className="card p-4 space-y-4">
          <h3 className="font-medium text-zinc-900">New Addon Group</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Group name *</label>
              <input
                className="input"
                placeholder="e.g. Extra Toppings, Dipping Sauces"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Min select</label>
              <input
                type="number"
                min={0}
                className="input"
                value={groupForm.minSelect}
                onChange={(e) => setGroupForm({ ...groupForm, minSelect: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Max select</label>
              <input
                type="number"
                min={0}
                className="input"
                value={groupForm.maxSelect}
                onChange={(e) => setGroupForm({ ...groupForm, maxSelect: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="ag-required"
                type="checkbox"
                checked={groupForm.isRequired}
                onChange={(e) => setGroupForm({ ...groupForm, isRequired: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-orange-500"
              />
              <label htmlFor="ag-required" className="text-sm text-zinc-700 cursor-pointer">
                Required (customer must select)
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!groupForm.name || createGroupMutation.isPending}
              onClick={() => createGroupMutation.mutate()}
            >
              {createGroupMutation.isPending ? "Saving…" : "Save Group"}
            </button>
            <button className="btn-secondary" onClick={() => { setShowGroupForm(false); setGroupForm(DEFAULT_ADDON_GROUP); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary self-start" onClick={() => setShowGroupForm(true)}>
          + Add Addon Group
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuItemCustomizePage({ params }: Props) {
  const { id: itemId } = use(params);

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["menu-item", itemId],
    queryFn: () => api.get<MenuItem>(`/menu-items/${itemId}`),
  });

  return (
    <div className="max-w-6xl">
      {/* Back link + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-5">
        <Link href="/menu/items" className="hover:text-zinc-800 transition-colors">
          ← Back to Items
        </Link>
        <span>/</span>
        <span className="text-zinc-400">Menu Items</span>
        <span>/</span>
        <span className="text-zinc-400">{item?.name ?? "…"}</span>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Customize</span>
      </div>

      {/* Item summary */}
      {itemLoading ? (
        <div className="h-16 bg-zinc-100 animate-pulse rounded-xl mb-8" />
      ) : item ? (
        <div className="card p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{item.name}</h1>
            {item.description && (
              <p className="text-sm text-zinc-500 mt-0.5">{item.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Base Price</p>
            <p className="text-xl font-semibold text-zinc-900">
              PKR {parseFloat(item.basePrice).toFixed(0)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <VariantSection itemId={itemId} />
        <AddonSection itemId={itemId} />
      </div>
    </div>
  );
}
