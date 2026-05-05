import { Pill } from "./Pill";

type Status = "online" | "offline" | "active" | "paused" | "ended";

const TONE: Record<Status, "ok" | "err" | "warn" | "neutral"> = {
  online: "ok",
  offline: "err",
  active: "ok",
  paused: "warn",
  ended: "neutral",
};

const LABEL: Record<Status, string> = {
  online: "Online",
  offline: "Offline",
  active: "Ativa",
  paused: "Pausada",
  ended: "Encerrada",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Pill tone={TONE[status]}>{LABEL[status]}</Pill>;
}
