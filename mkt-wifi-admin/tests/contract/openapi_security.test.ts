// OpenAPI security contract drift guard (slice-3 OQ-8 / Decision 11).
// Asserts that every non-public admin endpoint in the live /openapi.json
// declares a security requirement (HTTPBearer). Catches future-slice drift
// (e.g., a new admin endpoint accidentally added without Depends(verify_token)).
//
// Skipped if backend is offline.

import { describe, expect, it } from "vitest";

const BACKEND_URL = "http://localhost:8000/openapi.json";

const PUBLIC_PATHS = new Set([
  "/",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/portal/bootstrap",
  "/api/connect",
  "/api/sessions/{session_id}/ad-complete",
  "/api/sessions/{session_id}/renew",
]);

describe("OpenAPI security drift (slice-3 OQ-8)", () => {
  it("every non-public admin endpoint declares a Bearer security requirement", async () => {
    let spec: { paths: Record<string, Record<string, { security?: unknown[] }>> };
    try {
      const res = await fetch(BACKEND_URL);
      if (!res.ok) {
        console.warn(`Backend not reachable at ${BACKEND_URL} — skipping`);
        return;
      }
      spec = await res.json();
    } catch {
      console.warn(`Backend not reachable at ${BACKEND_URL} — skipping`);
      return;
    }

    const violations: string[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (PUBLIC_PATHS.has(path)) continue;
      for (const [method, op] of Object.entries(methods)) {
        if (!["get", "post", "patch", "delete", "put"].includes(method)) continue;
        const sec = op.security;
        if (!Array.isArray(sec) || sec.length === 0) {
          violations.push(`${method.toUpperCase()} ${path} has no security requirement`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
