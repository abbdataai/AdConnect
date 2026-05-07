import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type PrefsState = {
  lastVisitedRoute: string | null;
  setLastVisitedRoute: (path: string) => void;
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      lastVisitedRoute: null,
      setLastVisitedRoute: (path) => set({ lastVisitedRoute: path }),
    }),
    {
      name: "mktwifi-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
