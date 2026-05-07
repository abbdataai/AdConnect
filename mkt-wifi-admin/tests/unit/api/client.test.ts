// AT-012: client.ts 401 interceptor calls authStore.logout() and redirects.
// Tests that on 401 with a non-null user in the store, the interceptor:
//   1) clears the auth store
//   2) navigates to /login?reason=expired&next=<encoded-current-path>

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, client } from "../../../src/api/client";
import { useAuthStore } from "../../../src/stores/auth";

const ORIGINAL_LOCATION = window.location;

describe("client.ts 401 interceptor (slice-3 AT-012)", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { email: "admin@mktwifi.com", name: "Admin", role: "admin" },
      token: "fake-token",
      remember: false,
      loginAt: Date.now(),
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...ORIGINAL_LOCATION,
        pathname: "/usuarios",
        search: "?zone=Centro",
        href: "http://localhost:5174/usuarios?zone=Centro",
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: ORIGINAL_LOCATION,
    });
    vi.unstubAllGlobals();
    useAuthStore.setState({ user: null, token: null, remember: false, loginAt: null });
  });

  it("on 401, calls authStore.logout() and redirects to /login?reason=expired&next=...", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("token expired", { status: 401, statusText: "Unauthorized" }),
      ),
    );

    let thrown: ApiError | null = null;
    try {
      await client.get("/api/kpis");
    } catch (e) {
      thrown = e as ApiError;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown?.status).toBe(401);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.location.href).toBe(
      `/login?reason=expired&next=${encodeURIComponent("/usuarios?zone=Centro")}`,
    );
  });

  it("on 401 when already logged out, does NOT redirect (no infinite loop)", async () => {
    useAuthStore.setState({ user: null, token: null, remember: false, loginAt: null });
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...ORIGINAL_LOCATION, pathname: "/login", search: "", href: "/login" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    );

    try {
      await client.get("/api/kpis");
    } catch {
      // expected
    }
    expect(window.location.href).toBe("/login");
  });

  it("on 200, does not interfere with normal request flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, data: 42 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const data = await client.get<{ ok: boolean; data: number }>("/api/anything");
    expect(data.ok).toBe(true);
    expect(data.data).toBe(42);
    expect(useAuthStore.getState().user).not.toBeNull();
  });
});
