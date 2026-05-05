import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKOFF_MS, withRetries } from "../../../src/utils/withRetries";

describe("withRetries (ported from slice 1)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns ok on first success", async () => {
    const fn = vi.fn(async () => "value");
    const promise = withRetries(fn, DEFAULT_BACKOFF_MS);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ ok: true, value: "value" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries 3 times then returns err", async () => {
    const fn = vi.fn(async () => { throw new Error("boom"); });
    const promise = withRetries(fn, DEFAULT_BACKOFF_MS);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.attempts).toBe(4);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("recovers on third attempt", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 3) throw new Error("flaky");
      return 42;
    });
    const promise = withRetries(fn, DEFAULT_BACKOFF_MS);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });
});
