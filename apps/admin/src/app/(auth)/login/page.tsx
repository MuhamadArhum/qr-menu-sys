"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
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
      if (me.role === "SUPER_ADMIN") {
        toast.error("Use the Super Admin panel to login.");
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--cream)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: "var(--chili)" }}>
            <span className="text-white font-black text-2xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>A</span>
          </div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--char)" }}>Abyte Menu</h1>
          <p className="text-sm mt-1" style={{ color: "var(--char-60)" }}>Restaurant Admin Panel</p>
        </div>

        <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--paper)", border: "1.5px solid var(--char-15)" }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" placeholder="you@restaurant.com" className="input" {...register("email")} />
              {errors.email && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" placeholder="••••••••" className="input" {...register("password")} />
              {errors.password && <p className="text-xs mt-1" style={{ color: "var(--chili)" }}>{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--char-60)" }}>
          New restaurant?{" "}
          <Link href="/register" className="font-semibold" style={{ color: "var(--chili)" }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
