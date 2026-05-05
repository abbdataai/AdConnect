import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import type { Role } from "../types/api";

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
const STORAGE_KEY = "mktwifi-auth";

type User = { email: string; name: string; role: Role };

type Persisted = {
  user: User | null;
  token: string | null;
  remember: boolean;
  loginAt: number | null;
};

type AuthActions = {
  setSession: (user: User, token: string, remember: boolean) => void;
  logout: () => void;
  isExpired: () => boolean;
};

export type AuthState = Persisted & AuthActions;

const initialPersisted: Persisted = {
  user: null,
  token: null,
  remember: false,
  loginAt: null,
};

// Custom Storage adapter that reads from localStorage OR sessionStorage on get,
// and writes to localStorage when remember=true (else sessionStorage). Avoids
// the self-reference issue that Zustand v5's createJSONStorage callback produces.
//
// Defensive: vitest+jsdom occasionally exposes a Storage shim with missing
// methods. Each call feature-detects before invoking.
const callStorage = (s: Storage | undefined, method: "getItem" | "setItem" | "removeItem", ...args: string[]): string | null => {
  if (!s) return null;
  const fn = (s as unknown as Record<string, unknown>)[method];
  if (typeof fn !== "function") return null;
  const result = (fn as (...a: string[]) => unknown).apply(s, args);
  return typeof result === "string" ? result : null;
};
const ls = (): Storage | undefined => (typeof localStorage !== "undefined" ? localStorage : undefined);
const ss = (): Storage | undefined => (typeof sessionStorage !== "undefined" ? sessionStorage : undefined);

const dualStorage: StateStorage = {
  getItem: (name) => callStorage(ls(), "getItem", name) ?? callStorage(ss(), "getItem", name),
  setItem: (name, value) => {
    let remember = false;
    try {
      const parsed = JSON.parse(value) as { state?: Persisted };
      remember = parsed.state?.remember ?? false;
    } catch {
      remember = false;
    }
    if (remember) {
      callStorage(ls(), "setItem", name, value);
      callStorage(ss(), "removeItem", name);
    } else {
      callStorage(ss(), "setItem", name, value);
      callStorage(ls(), "removeItem", name);
    }
  },
  removeItem: (name) => {
    callStorage(ls(), "removeItem", name);
    callStorage(ss(), "removeItem", name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialPersisted,
      setSession: (user, token, remember) => {
        set({ user, token, remember, loginAt: Date.now() });
      },
      logout: () => {
        set({ ...initialPersisted });
        dualStorage.removeItem(STORAGE_KEY);
      },
      isExpired: () => {
        const loginAt = get().loginAt;
        if (!loginAt) return true;
        return Date.now() - loginAt > SEVEN_DAYS_MS;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: dualStorage as never,
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        remember: s.remember,
        loginAt: s.loginAt,
      }) as AuthState,
    },
  ),
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue === null) {
      useAuthStore.setState({ ...initialPersisted });
    }
  });
}
