"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/v1";

interface MenuItem {
  id: string;
  name: string;
  nameUr?: string | null;
  description?: string | null;
  descriptionUr?: string | null;
  basePrice: string;
  availability: string;
  status: string;
  imageUrl: string | null;
  categoryId: string;
  _count: { variantGroups: number; addonGroups: number };
}

interface Category { id: string; name: string }

interface EditForm {
  name: string;
  nameUr: string;
  basePrice: string;
  categoryId: string;
  description: string;
  descriptionUr: string;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: MenuItem;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name: item.name,
    nameUr: item.nameUr ?? "",
    basePrice: parseFloat(item.basePrice).toString(),
    categoryId: item.categoryId,
    description: item.description ?? "",
    descriptionUr: item.descriptionUr ?? "",
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/menu-items/${item.id}`, {
        name: form.name,
        nameUr: form.nameUr || undefined,
        basePrice: parseFloat(form.basePrice),
        categoryId: form.categoryId,
        description: form.description || undefined,
        descriptionUr: form.descriptionUr || undefined,
      }),
    onSuccess: () => {
      toast.success("Item updated");
      onSaved();
      onClose();
    },
    onError: () => toast.error("Failed to update item"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-900">Edit Item</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name (English) *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">نام (اردو)</label>
            <input className="input text-right" dir="rtl" placeholder="اردو نام" value={form.nameUr} onChange={(e) => setForm({ ...form, nameUr: e.target.value })} />
          </div>
          <div>
            <label className="label">Base Price (PKR) *</label>
            <input type="number" step="0.01" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description (English)</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">تفصیل (اردو)</label>
            <input className="input text-right" dir="rtl" placeholder="اردو تفصیل" value={form.descriptionUr} onChange={(e) => setForm({ ...form, descriptionUr: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            className="btn-primary flex-1"
            disabled={!form.name || !form.basePrice || !form.categoryId || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ItemsContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const catFilter = searchParams.get("categoryId") ?? "";

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: "", nameUr: "", basePrice: "", categoryId: catFilter, description: "", descriptionUr: "" });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const endpoint = catFilter ? `/menu-items?categoryId=${catFilter}` : "/menu-items";
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items", catFilter],
    queryFn: () => api.get<MenuItem[]>(endpoint),
  });

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const fd = new FormData();
    fd.append("file", file);
    setImageUploading(true);
    try {
      const res = await fetch(`${BASE}/storage/upload?folder=menu-items`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setImageUploading(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/menu-items", {
        name: form.name,
        nameUr: form.nameUr || undefined,
        basePrice: parseFloat(form.basePrice),
        categoryId: form.categoryId,
        description: form.description || undefined,
        descriptionUr: form.descriptionUr || undefined,
        imageUrl: imageUrl ?? undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      setForm({ name: "", nameUr: "", basePrice: "", categoryId: catFilter, description: "", descriptionUr: "" });
      setImageUrl(null);
      setShowForm(false);
      toast.success("Item created");
    },
    onError: () => toast.error("Failed to create item"),
  });

  const availMutation = useMutation({
    mutationFn: ({ id, availability }: { id: string; availability: string }) =>
      api.patch(`/menu-items/${id}/availability`, { availability }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Availability updated");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/menu-items/${id}/archive`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Item archived");
    },
  });

  const AVAIL_OPTIONS = ["AVAILABLE", "SOLD_OUT", "HIDDEN"];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Menu Items</h1>
          <p className="text-zinc-500 text-sm">{catFilter ? "Filtered by category" : "All items"}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Item</button>
      </div>

      {/* Add item form */}
      {showForm && (
        <div className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-zinc-900">New Menu Item</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name (English) *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">نام (اردو)</label>
              <input className="input text-right" dir="rtl" placeholder="اردو نام" value={form.nameUr} onChange={(e) => setForm({ ...form, nameUr: e.target.value })} />
            </div>
            <div>
              <label className="label">Base Price *</label>
              <input type="number" step="0.01" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description (English)</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">تفصیل (اردو)</label>
              <input className="input text-right" dir="rtl" placeholder="اردو تفصیل" value={form.descriptionUr} onChange={(e) => setForm({ ...form, descriptionUr: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Item Image</label>
            <input
              type="file"
              accept="image/*"
              className="block text-sm text-zinc-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              onChange={handleImageChange}
              disabled={imageUploading}
            />
            {imageUploading && (
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Uploading…
              </div>
            )}
            {imageUrl && !imageUploading && (
              <div className="mt-2 flex items-center gap-2">
                <img src={imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-zinc-200" />
                <span className="text-xs text-zinc-500">Image ready</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!form.name || !form.basePrice || !form.categoryId || createMutation.isPending || imageUploading}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Save Item"}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Items table */}
      {isLoading ? (
        <div className="card overflow-hidden animate-pulse">
          <div className="bg-zinc-50 border-b border-zinc-100 flex gap-4 px-4 py-3">
            {[40, 180, 80, 110, 90, 120].map((w, i) => (
              <div key={i} className="h-3 rounded bg-zinc-200" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-zinc-100 last:border-0">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 shrink-0" />
              <div className="h-3 rounded bg-zinc-100" style={{ width: 140 + (i % 3) * 20 }} />
              <div className="h-3 w-16 rounded bg-zinc-100" />
              <div className="h-6 w-24 rounded-lg bg-zinc-100" />
              <div className="h-3 w-12 rounded bg-zinc-100" />
              <div className="h-3 w-28 rounded bg-zinc-100 ml-auto" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-2">🍽</p>
          <p className="text-zinc-500">No items yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 w-12" />
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Price</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Availability</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Variants/Addons</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-zinc-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300 text-xs">No img</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    {item.nameUr && <p className="text-xs text-zinc-400 mt-0.5" dir="rtl">{item.nameUr}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">PKR {parseFloat(item.basePrice).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white"
                      value={item.availability}
                      onChange={(e) => availMutation.mutate({ id: item.id, availability: e.target.value })}
                    >
                      {AVAIL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt.replace("_", " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {item._count.variantGroups}V · {item._count.addonGroups}A
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Edit
                      </button>
                      <Link
                        href={`/menu/items/${item.id}`}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                        Customize
                      </Link>
                      <button
                        onClick={() => archiveMutation.mutate(item.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["menu-items"] })}
        />
      )}
    </div>
  );
}

export default function ItemsPage() {
  return (
    <Suspense>
      <ItemsContent />
    </Suspense>
  );
}
