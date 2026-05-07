import { useToastsStore } from "../stores/toasts";

export function ToastContainer() {
  const queue = useToastsStore((s) => s.queue);
  const dismiss = useToastsStore((s) => s.dismiss);
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {queue.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
