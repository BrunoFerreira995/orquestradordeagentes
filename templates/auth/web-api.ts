export type Role = "admin" | "operator" | "viewer";
export type User = { id: number; email: string; role: Role; permissions: string[] };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "project_token";
export class ApiError extends Error { constructor(public status: number, public code: string, public requestId?: string) { super(code); this.name = "ApiError"; } }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiError(response.status, body?.error ?? "api_error", response.headers.get("x-request-id") ?? body?.request_id); }
  return response.json();
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },
  me: () => request<User>("/auth/me"),
  permissions: () => request<{ role: Role; permissions: string[] }>("/auth/permissions"),
  logout: async () => { await request<{ ok: boolean }>("/auth/logout", { method: "POST" }); localStorage.removeItem(TOKEN_KEY); },
  requestRecovery: (email: string) => request<{ accepted: boolean }>("/auth/recovery/request", { method: "POST", body: JSON.stringify({ email }) }),
  orchestratorStatus: () => request<{ enabled: boolean; data?: { status: string }; error?: string }>("/orchestrator/status"),
  orchestratorTasks: () => request<{ enabled: boolean; data?: unknown[]; error?: string }>("/orchestrator/tasks"),
  orchestratorWorkers: () => request<{ enabled: boolean; data?: unknown[]; error?: string }>("/orchestrator/workers"),
  users: () => request<User[]>("/users"),
};
