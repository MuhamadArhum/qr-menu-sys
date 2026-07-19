"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { getMe } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60_000 } },
});

const SESSION_KEY = "abyte_user";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthLoader>{children}</AuthLoader>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Restore cached user instantly — avoids auth waterfall on every nav
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
        setLoading(false);
      } catch { /* ignore */ }
    }

    // Always revalidate in the background to catch token expiry
    const token = localStorage.getItem("access_token");
    if (!token) { setUser(null); setLoading(false); return; }

    getMe()
      .then((u) => { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); setUser(u); })
      .catch(() => { sessionStorage.removeItem(SESSION_KEY); setUser(null); })
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return <>{children}</>;
}
