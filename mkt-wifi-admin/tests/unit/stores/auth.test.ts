import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../../src/stores/auth";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, remember: false, loginAt: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("setSession hydrates state and stamps loginAt", () => {
    const before = Date.now();
    useAuthStore.getState().setSession(
      { email: "admin@mktwifi.com", name: "Admin", role: "admin" },
      "token-abc",
      true,
    );
    const s = useAuthStore.getState();
    expect(s.user?.role).toBe("admin");
    expect(s.token).toBe("token-abc");
    expect(s.remember).toBe(true);
    expect(s.loginAt).toBeGreaterThanOrEqual(before);
  });

  it("logout clears state and storages", () => {
    useAuthStore.getState().setSession(
      { email: "admin@mktwifi.com", name: "Admin", role: "admin" },
      "token-abc",
      true,
    );
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.loginAt).toBeNull();
  });

  it("isExpired returns true when loginAt is null", () => {
    expect(useAuthStore.getState().isExpired()).toBe(true);
  });

  it("isExpired returns false within 7 days", () => {
    useAuthStore.getState().setSession(
      { email: "x", name: "X", role: "admin" },
      "t",
      false,
    );
    expect(useAuthStore.getState().isExpired()).toBe(false);
  });

  it("isExpired returns true past 7 days", () => {
    vi.useFakeTimers();
    const t0 = new Date("2026-05-04T00:00:00Z").getTime();
    vi.setSystemTime(t0);
    useAuthStore.getState().setSession(
      { email: "x", name: "X", role: "admin" },
      "t",
      false,
    );
    vi.setSystemTime(t0 + 8 * 24 * 3600 * 1000);
    expect(useAuthStore.getState().isExpired()).toBe(true);
    vi.useRealTimers();
  });
});
