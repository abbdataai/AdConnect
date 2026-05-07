import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastsStore } from "../../../src/stores/toasts";

describe("useToastsStore", () => {
  beforeEach(() => {
    useToastsStore.setState({ queue: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueue adds a toast to the queue", () => {
    useToastsStore.getState().enqueue("Hello", "ok");
    expect(useToastsStore.getState().queue).toHaveLength(1);
    expect(useToastsStore.getState().queue[0]!.message).toBe("Hello");
    expect(useToastsStore.getState().queue[0]!.kind).toBe("ok");
  });

  it("dismiss removes a toast by id", () => {
    useToastsStore.getState().enqueue("A");
    useToastsStore.getState().enqueue("B");
    const id = useToastsStore.getState().queue[0]!.id;
    useToastsStore.getState().dismiss(id);
    expect(useToastsStore.getState().queue).toHaveLength(1);
    expect(useToastsStore.getState().queue[0]!.message).toBe("B");
  });

  it("toast auto-dismisses after 3 seconds", () => {
    useToastsStore.getState().enqueue("Hello");
    expect(useToastsStore.getState().queue).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(useToastsStore.getState().queue).toHaveLength(0);
  });
});
