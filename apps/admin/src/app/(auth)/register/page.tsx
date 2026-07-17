"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, ApiError } from "@/lib/api";

const schema = z
  .object({
    legalName: z.string().min(2, "Min 2 characters").max(100),
    displayName: z.string().min(2, "Min 2 characters").max(60),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, "Must contain a letter and a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      await api.post("/auth/register", {
        legalName: data.legalName,
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      });
      toast.success("Registration submitted! Await admin approval before logging in.");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Abyte Menu</h1>
          <p className="text-zinc-500 text-sm mt-1">Register your restaurant</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Legal Name</label>
              <input
                type="text"
                placeholder="Pizza Palace Pvt Ltd"
                className="input"
                {...register("legalName")}
              />
              {errors.legalName && (
                <p className="text-red-500 text-xs mt-1">{errors.legalName.message}</p>
              )}
            </div>

            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                placeholder="Pizza Palace"
                className="input"
                {...register("displayName")}
              />
              {errors.displayName && (
                <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                placeholder="you@restaurant.com"
                className="input"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? "Submitting…" : "Register Restaurant"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
