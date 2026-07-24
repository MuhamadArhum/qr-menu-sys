"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

interface CmsForm {
  slug: string;
  title: string;
  body: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY_FORM: CmsForm = { slug: "", title: "", body: "", status: "ACTIVE" };

function formFromPage(page: CmsPage): CmsForm {
  return { slug: page.slug, title: page.title, body: page.body, status: page.status === "INACTIVE" ? "INACTIVE" : "ACTIVE" };
}

export default function CmsPageAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CmsForm>(EMPTY_FORM);

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ["cms-pages"],
    queryFn: () => api.get<CmsPage[]>("/cms"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CmsForm) => api.post<CmsPage>("/cms", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms-pages"] }); setCreating(false); setForm(EMPTY_FORM); toast.success("Page created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CmsForm> }) => api.patch<CmsPage>(`/cms/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms-pages"] }); setEditing(null); toast.success("Page updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del<void>(`/cms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cms-pages"] }); toast.success("Page deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function startCreate() { setForm(EMPTY_FORM); setEditing(null); setCreating(true); }
  function startEdit(page: CmsPage) { setForm(formFromPage(page)); setCreating(false); setEditing(page.id); }
  function cancel() { setEditing(null); setCreating(false); setForm(EMPTY_FORM); }

  const submitCreate = () => createMutation.mutate(form);
  const submitUpdate = () => editing && updateMutation.mutate({ id: editing, data: form });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            CMS Pages
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--char-60)" }}>
            Manage static content — FAQs, policies, landing sections
          </p>
        </div>
        {!creating && !editing && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}
          >
            <span className="text-base leading-none">+</span>
            New Page
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--cream)", border: "1.5px solid rgba(28,23,16,0.1)" }}>
          <h2 className="font-black text-sm" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>
            {creating ? "New CMS Page" : "Edit CMS Page"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--char-60)" }}>Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="privacy-policy"
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.15)", color: "var(--char)", fontFamily: "JetBrains Mono, monospace" }}
                readOnly={!!editing}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--char-60)" }}>Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Privacy Policy"
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.15)", color: "var(--char)" }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--char-60)" }}>Body (Markdown)</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="# Privacy Policy&#10;&#10;Your content here..."
              rows={10}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-y font-mono"
              style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.15)", color: "var(--char)", minHeight: "180px" }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--char-60)" }}>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as "ACTIVE" | "INACTIVE" }))}
              className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: "var(--paper)", border: "1.5px solid rgba(28,23,16,0.15)", color: "var(--char)" }}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={creating ? submitCreate : submitUpdate}
              disabled={!form.slug.trim() || !form.title.trim() || createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--chili)", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {creating ? "Create" : "Save Changes"}
            </button>
            <button
              onClick={cancel}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(28,23,16,0.06)", color: "var(--char-60)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--cream)" }} />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={{ background: "var(--cream)" }}>
          <div className="text-4xl mb-3">📄</div>
          <p className="font-bold text-sm" style={{ color: "var(--char)" }}>No pages yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--char-60)" }}>Create your first CMS page above</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid rgba(28,23,16,0.1)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--cream)" }}>
              <tr>
                {["Slug", "Title", "Status", "Updated", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--char-60)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ background: "var(--paper)" }}>
              {pages.map((page, i) => (
                <tr key={page.id} style={i < pages.length - 1 ? { borderBottom: "1px solid rgba(28,23,16,0.06)" } : {}}>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background: "var(--cream)", color: "var(--chili)" }}>
                      {page.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
                    {page.title}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={page.status === "ACTIVE"
                        ? { background: "rgba(143,163,0,0.12)", color: "var(--lime)" }
                        : { background: "rgba(28,23,16,0.06)", color: "var(--char-60)" }}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: "var(--char-60)" }}>
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => startEdit(page)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(28,23,16,0.06)", color: "var(--char)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${page.title}"?`)) deleteMutation.mutate(page.id);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(255,70,48,0.08)", color: "var(--chili)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
