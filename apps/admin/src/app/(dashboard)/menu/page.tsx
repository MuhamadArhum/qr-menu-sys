"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
  _count: { menuItems: number; children: number };
  children: Category[];
}

export default function MenuPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/categories", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setCreating(false);
      toast.success("Category created");
    },
    onError: () => toast.error("Failed to create category"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/categories/${id}/archive`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category archived");
    },
    onError: () => toast.error("Failed to archive"),
  });

  return (
    <div className="">
      {/* Page Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Menu Categories</h1>
          <p className="page-subtitle">Manage your menu structure</p>
        </div>
        <div className="flex gap-2">
          <Link href="/menu/items" className="btn-secondary">View Items</Link>
          <button onClick={() => setCreating(true)} className="btn-primary">+ Add Category</button>
        </div>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Category</h2>
          <div className="flex gap-3 items-center">
            <input
              autoFocus
              placeholder="Category name"
              className="input flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newName && createMutation.mutate(newName)}
            />
            <button
              className="btn-primary"
              disabled={!newName || createMutation.isPending}
              onClick={() => createMutation.mutate(newName)}
            >
              {createMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Category List */}
      {isLoading ? (
        <Skeleton />
      ) : categories.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              onArchive={(id) => archiveMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ cat, onArchive }: { cat: Category; onArchive: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        {/* Expand toggle + icon */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {cat.children.length > 0 ? (
            <span className="text-xs font-bold">{expanded ? "▾" : "▸"}</span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
          )}
        </button>

        {/* Category initial circle */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span className="text-emerald-700 font-bold text-sm uppercase">
            {cat.name.charAt(0)}
          </span>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{cat.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              {cat._count.menuItems} {cat._count.menuItems === 1 ? "item" : "items"}
            </span>
            {cat._count.children > 0 && (
              <span className="text-xs text-gray-400">
                {cat._count.children} sub-{cat._count.children === 1 ? "category" : "categories"}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${
          cat.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-gray-100 text-gray-500"
        }`}>
          {cat.status === "ACTIVE" ? "Active" : cat.status.toLowerCase()}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/menu/items?categoryId=${cat.id}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
          >
            View Items
          </Link>
          <button
            onClick={() => onArchive(cat.id)}
            className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 font-semibold transition-colors"
          >
            Archive
          </button>
        </div>
      </div>

      {/* Sub-categories */}
      {expanded && cat.children.length > 0 && (
        <div className="border-t border-gray-100">
          {cat.children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              {/* Indent spacer */}
              <div className="w-8 flex-shrink-0 flex justify-center">
                <div className="w-0.5 h-full bg-gray-200 rounded-full" />
              </div>

              {/* Sub-category initial circle */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-xs uppercase">
                  {child.name.charAt(0)}
                </span>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">{child.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 font-medium">
                    {child._count.menuItems} {child._count.menuItems === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>

              {/* Sub-category status */}
              <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${
                child.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {child.status === "ACTIVE" ? "Active" : child.status.toLowerCase()}
              </span>

              {/* Sub-category actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/menu/items?categoryId=${child.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                >
                  View Items
                </Link>
                <button
                  onClick={() => onArchive(child.id)}
                  className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 font-semibold transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
            <div className="h-3 bg-gray-100 rounded-lg w-1/5" />
          </div>
          <div className="h-6 w-14 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="h-7 w-20 bg-gray-100 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="card p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 6h16M4 10h16M4 14h8M4 18h8" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">No categories yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Create your first category to start building your menu structure.
      </p>
    </div>
  );
}
