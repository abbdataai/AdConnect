import type {
  AdCompleteResponse, BootstrapResponse, ConnectRequest,
  ConnectResponse, PortalQuery, RenewResponse,
} from "./types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function getBootstrap(q: PortalQuery): Promise<BootstrapResponse> {
  const params = new URLSearchParams(q).toString();
  return call<BootstrapResponse>(`/api/portal/bootstrap?${params}`);
}

export async function postConnect(body: ConnectRequest): Promise<ConnectResponse> {
  return call<ConnectResponse>("/api/connect", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postAdComplete(sessionId: string): Promise<AdCompleteResponse> {
  return call<AdCompleteResponse>(
    `/api/sessions/${sessionId}/ad-complete`,
    { method: "POST", body: "{}" },
  );
}

export async function postRenew(sessionId: string): Promise<RenewResponse> {
  return call<RenewResponse>(
    `/api/sessions/${sessionId}/renew`,
    { method: "POST", body: "{}" },
  );
}

export { ApiError };
