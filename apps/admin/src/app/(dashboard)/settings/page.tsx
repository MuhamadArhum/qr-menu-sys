"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, uploadFile, ApiError } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const schema = z.object({
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultCurrency: z.string().length(3),
  accentColor: z.string(),
});
type Form = z.infer<typeof schema>;

interface Restaurant {
  id: string;
  legalName: string;
  displayName: string;
  description: string | null;
  defaultCurrency: string;
  accentColor: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  status: string;
}

function ImageUploadCard({
  label,
  hint,
  currentUrl,
  aspect,
  onUpload,
}: {
  label: string;
  hint: string;
  currentUrl: string | null;
  aspect: "square" | "wide";
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadFile<{ url: string; publicId: string; thumbnailUrl: string }>(
        "/storage/upload?folder=restaurants",
        fd,
      );
      onUpload(url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
        {label}
      </p>
      <p className="text-xs mb-3" style={{ color: "var(--char-60)" }}>{hint}</p>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

      <div className="flex items-end gap-4">
        {/* Preview */}
        <div
          className="relative rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center group cursor-pointer"
          style={{
            width: aspect === "square" ? 80 : 160,
            height: 80,
            background: "var(--char-08)",
            border: "1.5px solid var(--char-15)",
          }}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--chili)", borderTopColor: "transparent" }} />
          ) : currentUrl ? (
            <>
              <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                style={{ background: "rgba(28,23,16,0.5)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--char-40)" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : currentUrl ? "Change Image" : "Upload Image"}
          </button>
          <p className="text-[11px]" style={{ color: "var(--char-40)" }}>
            JPEG, PNG, WebP · max 5 MB
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: () => api.get<Restaurant>("/restaurants/me"),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (restaurant) {
      reset({
        displayName: restaurant.displayName,
        description: restaurant.description ?? "",
        defaultCurrency: restaurant.defaultCurrency,
        accentColor: restaurant.accentColor,
      });
    }
  }, [restaurant, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: Form) => api.patch("/restaurants/me", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "me"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  async function handleLogoUpload(url: string) {
    await api.patch("/restaurants/me", { logoUrl: url });
    qc.invalidateQueries({ queryKey: ["restaurant", "me"] });
    toast.success("Logo updated");
  }

  async function handleCoverUpload(url: string) {
    await api.patch("/restaurants/me", { coverImageUrl: url });
    qc.invalidateQueries({ queryKey: ["restaurant", "me"] });
    toast.success("Cover image updated");
  }

  const changePwMutation = useMutation({
    mutationFn: () => api.post("/auth/change-password", {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    }),
    onSuccess: () => {
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors({});
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) toast.error("Current password incorrect");
      else toast.error("Failed to update password");
    },
  });

  function validatePw() {
    const errs: typeof pwErrors = {};
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(pwForm.newPassword))
      errs.newPassword = "Min 8 chars with at least one letter and one number";
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (validatePw()) changePwMutation.mutate();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Restaurant profile &amp; preferences</p>
      </div>

      {/* ── Images ────────────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-6">
        <h2 className="text-sm font-bold" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
          Branding Images
        </h2>
        <ImageUploadCard
          label="Restaurant Logo"
          hint="Shown on the customer menu header. Square image recommended."
          currentUrl={restaurant?.logoUrl ?? null}
          aspect="square"
          onUpload={handleLogoUpload}
        />
        <div className="border-t" style={{ borderColor: "var(--char-08)" }} />
        <ImageUploadCard
          label="Cover / Banner Image"
          hint="Wide banner displayed at the top of your customer menu."
          currentUrl={restaurant?.coverImageUrl ?? null}
          aspect="wide"
          onUpload={handleCoverUpload}
        />
      </div>

      {/* ── Profile ───────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
          Restaurant Profile
        </h2>

        {restaurant && (
          <div className="mb-4 px-3 py-2.5 rounded-xl" style={{ background: "var(--char-08)" }}>
            <p className="text-xs" style={{ color: "var(--char-60)" }}>Legal Name (cannot be changed)</p>
            <p className="font-semibold text-sm mt-0.5" style={{ color: "var(--char)" }}>{restaurant.legalName}</p>
          </div>
        )}

        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input className="input" {...register("displayName")} />
            {errors.displayName && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{errors.displayName.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input resize-none" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Currency (e.g. PKR, USD)</label>
              <input className="input" maxLength={3} {...register("defaultCurrency")} />
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" className="h-9 w-12 rounded-xl cursor-pointer border" style={{ borderColor: "var(--char-15)" }} {...register("accentColor")} />
                <input className="input flex-1 font-mono text-sm" {...register("accentColor")} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={!isDirty || updateMutation.isPending} className="btn-primary">
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--char)", fontFamily: "Space Grotesk, sans-serif" }}>
          Change Password
        </h2>
        <form onSubmit={handleChangePw} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            {pwErrors.newPassword && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{pwErrors.newPassword}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
            {pwErrors.confirmPassword && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{pwErrors.confirmPassword}</p>}
          </div>
          <button type="submit"
            disabled={!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword || changePwMutation.isPending}
            className="btn-primary">
            {changePwMutation.isPending ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
