export type OrchestratorResult<T> = { enabled: boolean; data?: T; error?: string };

const base = process.env.ORCHESTRATOR_API_URL?.replace(/\/$/, "");
const token = process.env.ORCHESTRATOR_API_TOKEN;
const project = process.env.ORCHESTRATOR_PROJECT_ID;

async function get<T>(path: string): Promise<OrchestratorResult<T>> {
  if (!base) return { enabled: false };
  try {
    const response = await fetch(`${base}${path}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-project-id": project ?? "" } });
    if (!response.ok) return { enabled: true, error: `orchestrator_http_${response.status}` };
    return { enabled: true, data: await response.json() };
  } catch { return { enabled: true, error: "orchestrator_unreachable" }; }
}

export const orchestrator = { status: () => get<{ status: string }>("/health"), tasks: () => get<unknown[]>("/tasks"), workers: () => get<unknown[]>("/workers") };
