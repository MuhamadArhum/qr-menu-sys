const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sa_access_token");
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function login(email: string, password: string) {
  const data = await api.post<{ accessToken: string; refreshToken: string }>("/auth/login", { email, password });
  localStorage.setItem("sa_access_token", data.accessToken);
  localStorage.setItem("sa_refresh_token", data.refreshToken);
  return data;
}

export async function logout() {
  const rt = localStorage.getItem("sa_refresh_token");
  if (rt) await api.post("/auth/logout", { refreshToken: rt }).catch(() => {});
  localStorage.removeItem("sa_access_token");
  localStorage.removeItem("sa_refresh_token");
}

export async function getMe() {
  return api.get<{ id: string; email: string; role: string; restaurantId: string | null }>("/auth/me");
}
