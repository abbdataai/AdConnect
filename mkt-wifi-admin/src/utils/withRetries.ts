// Ported from captive-portal-frontend/src/state/retry.ts (slice 1 Decision 11).
// Bounded retry with exponential backoff. Pure helper, unit-testable with fake timers.

export type RetryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown; attempts: number };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RetryHooks = {
  onAttempt?: (i: number) => void;
  onWaiting?: (waitMs: number, nextI: number) => void;
};

export async function withRetries<T>(
  fn: () => Promise<T>,
  delaysMs: readonly number[],
  hooks: RetryHooks = {},
): Promise<RetryResult<T>> {
  let lastError: unknown = null;
  const totalAttempts = delaysMs.length + 1;
  for (let i = 0; i < totalAttempts; i++) {
    hooks.onAttempt?.(i);
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (err) {
      lastError = err;
      if (i === totalAttempts - 1) break;
      const wait = delaysMs[i]!;
      hooks.onWaiting?.(wait, i + 1);
      await delay(wait);
    }
  }
  return { ok: false, error: lastError, attempts: totalAttempts };
}

export const DEFAULT_BACKOFF_MS = [1000, 2000, 4000] as const;
