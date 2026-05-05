import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { ProgressBar } from "../../ui/ProgressBar";
import { StatusBadge } from "../../ui/StatusBadge";
import { useDevices, useRefreshDevice } from "../../api/devices";
import { useToastsStore } from "../../stores/toasts";
import { useAuthStore } from "../../stores/auth";
import { STR } from "../../strings";

function cpuTone(pct: number) {
  if (pct >= 75) return "err" as const;
  if (pct >= 60) return "warn" as const;
  return "ok" as const;
}

export function WifiPage() {
  const { data: devices = [] } = useDevices();
  const refresh = useRefreshDevice();
  const enqueue = useToastsStore((s) => s.enqueue);
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const totalUsers = devices.reduce((s, d) => s + d.users, 0);
  const totalUp = devices.reduce((s, d) => s + d.up, 0);

  return (
    <div className="wifi">
      <div className="wifi__kpis">
        <div className="kpi"><div className="kpi__label">{STR.wifi.kpi.online}</div><div className="kpi__value">{online}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.wifi.kpi.offline}</div><div className="kpi__value">{offline}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.wifi.kpi.connectedUsers}</div><div className="kpi__value">{totalUsers}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.wifi.kpi.bandwidth}</div><div className="kpi__value">{totalUp.toFixed(1)} Mb/s</div></div>
      </div>

      <div className="wifi__grid">
        {devices.map((d) => (
          <Card
            key={d.id}
            title={d.name}
            actions={<StatusBadge status={d.status} />}
          >
            <div className="device-card__meta">
              <div><span>IP</span><strong>{d.ip}</strong></div>
              <div><span>MAC</span><strong>{d.mac}</strong></div>
            </div>
            {d.status === "online" ? (
              <>
                <ProgressBar pct={d.cpu} label={STR.wifi.cpu} tone={cpuTone(d.cpu)} />
                <ProgressBar pct={d.ram} label={STR.wifi.ram} tone={cpuTone(d.ram)} />
                <div className="device-card__throughput">
                  <span>{d.users} {STR.wifi.users}</span>
                  <span>{STR.wifi.up} {d.up.toFixed(1)}</span>
                  <span>{STR.wifi.down} {d.down.toFixed(1)}</span>
                </div>
              </>
            ) : (
              <div className="device-card__offline">
                <span>{STR.wifi.lastSeen}: {d.lastSeen ?? "—"}</span>
              </div>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await refresh.mutateAsync(d.id);
                  enqueue(STR.wifi.refreshed);
                }}
                data-testid={`device-refresh-${d.id}`}
              >
                {STR.wifi.refresh}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
