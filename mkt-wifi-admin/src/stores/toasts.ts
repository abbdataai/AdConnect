import { create } from "zustand";

export type ToastKind = "ok" | "err";
export type Toast = { id: string; message: string; kind: ToastKind; createdAt: number };

type ToastsState = {
  queue: Toast[];
  enqueue: (message: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
};

let counter = 0;
const nextId = () => `t-${++counter}-${Date.now()}`;

export const useToastsStore = create<ToastsState>((set, get) => ({
  queue: [],
  enqueue: (message, kind = "ok") => {
    const id = nextId();
    const toast: Toast = { id, message, kind, createdAt: Date.now() };
    set({ queue: [...get().queue, toast] });
    setTimeout(() => get().dismiss(id), 3000);
  },
  dismiss: (id) => set({ queue: get().queue.filter((t) => t.id !== id) }),
}));
