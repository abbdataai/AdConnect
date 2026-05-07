import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AD_COMPLETE_BACKOFF_MS, withRetries,
} from "../../src/state/retry";

describe("withRetries (Decision 11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ok on first success — no retries used", async () => {
    const fn = vi.fn(async () => "value");
    const onAttempt = vi.fn();
    const onWaiting = vi.fn();

    const promise = withRetries(fn, AD_COMPLETE_BACKOFF_MS, { onAttempt, onWaiting });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true, value: "value" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledWith(0);
    expect(onWaiting).not.toHaveBeenCalled();
  });

  it("retries with exact 1s/2s/4s backoff on persistent failure, then returns err", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const onAttempt = vi.fn();
    const onWaiting = vi.fn();

    const promise = withRetries(fn, AD_COMPLETE_BACKOFF_MS, { onAttempt, onWaiting });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBe(4);
      expect((result.error as Error).message).toBe("boom");
    }
    expect(fn).toHaveBeenCalledTimes(4);
    expect(onAttempt).toHaveBeenCalledTimes(4);
    expect(onWaiting).toHaveBeenCalledTimes(3);
    expect(onWaiting).toHaveBeenNthCalledWith(1, 1000, 1);
    expect(onWaiting).toHaveBeenNthCalledWith(2, 2000, 2);
    expect(onWaiting).toHaveBeenNthCalledWith(3, 4000, 3);
  });

  it("succeeds on the third attempt — returns ok with the recovered value", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("flaky");
      return { expires_at: "2026-05-04T12:00:00Z" };
    });

    const promise = withRetries(fn, AD_COMPLETE_BACKOFF_MS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.expires_at).toBe("2026-05-04T12:00:00Z");
    }
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not loop infinitely — closes the original silent-loop bug", async () => {
    const fn = vi.fn(async () => {
      throw new Error("never recovers");
    });

    const promise = withRetries(fn, AD_COMPLETE_BACKOFF_MS);
    await vi.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("respects an empty delays array — single attempt, no retries", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });

    const promise = withRetries(fn, []);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
