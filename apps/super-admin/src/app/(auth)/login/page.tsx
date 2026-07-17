"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { login, getMe, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      await login(data.email, data.password);
      const me = await getMe();
      if (me.role !== "SUPER_ADMIN") {
        toast.error("Access denied. Super Admin only.");
        return;
      }
      setUser(me);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--char)" }}>
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 25% 25%, var(--mango) 0%, transparent 50%), radial-gradient(circle at 75% 75%, var(--chili) 0%, transparent 50%)",
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl"
            style={{ background: "var(--chili)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--cream)" }}>
            Super Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,247,234,0.5)" }}>Abyte Menu Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{ background: "var(--paper)", border: "1.5px solid rgba(255,255,255,0.08)" }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" placeholder="admin@abyte.com" className="input" {...register("email")} />
              {errors.email && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" placeholder="••••••••" className="input" {...register("password")} />
              {errors.password && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,247,234,0.3)" }}>
          Restricted access · Abyte Menu Platform
        </p>
      </div>
    </div>
  );
}
