import { useAuthStore } from "../stores/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 && useAuthStore.getState().user) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.href = `/login?reason=expired&next=${next}`;
      }
    }
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function buildQs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string | number][];
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const client = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    call<T>("GET", path + buildQs(params)),
  post: <T>(path: string, body?: unknown) => call<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => call<T>("PATCH", path, body),
  delete: (path: string) => call<void>("DELETE", path),
};
