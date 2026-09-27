const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// credentials: "include" so the session cookie travels with every call.
export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  if (!response.ok) {
    // FastAPI puts the human-readable reason in `detail`.
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new Error(detail ?? `${init?.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response;
}
