import { useState } from "react";
import { Card } from "../../ui/Card";
import { ProgressBar } from "../../ui/ProgressBar";
import { Sparkline } from "../../ui/Sparkline";
import { Tabs } from "../../ui/Tabs";
import { useKpis, useWeeklyConnections, useDemographics } from "../../api/kpis";
import { useCampaigns } from "../../api/campaigns";
import { useLiveUsers } from "../../api/users";
import { STR } from "../../strings";
import { formatBRL, formatDelta, formatRelative, getInitials } from "../../utils/format";

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="kpi" data-testid={`kpi-${label}`}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta !== undefined && <div className="kpi__delta">{delta}</div>}
    </div>
  );
}

export function DashboardPage() {
  const kpis = useKpis().data;
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const weekly = useWeeklyConnections().data ?? [];
  const demo = useDemographics().data;
  const activeCampaigns = useCampaigns({ status: "active", limit: 4 }).data ?? [];
  const liveUsers = useLiveUsers({ limit: 5 }).data ?? [];

  return (
    <div className="dashboard">
      <div className="dashboard__kpis">
        {kpis && (
          <>
            <KpiCard label={STR.dashboard.kpis.reach} value={kpis.reach.toLocaleString("pt-BR")} delta={formatDelta(kpis.reachDelta)} />
            <KpiCard label={STR.dashboard.kpis.activeCampaigns} value={String(kpis.activeCampaigns)} delta={formatDelta(kpis.campaignsDelta, "abs")} />
            <KpiCard label={STR.dashboard.kpis.investment} value={formatBRL(kpis.investment)} delta={formatDelta(kpis.investmentDelta)} />
            <KpiCard label={STR.dashboard.kpis.onlineDevices} value={String(kpis.onlineDevices)} />
          </>
        )}
      </div>

      <div className="dashboard__row">
        <Card
          title={STR.dashboard.chart.title}
          actions={
            <Tabs
              value={range}
              onChange={setRange}
              options={[
                { id: "7d", label: STR.dashboard.chart.toggle7d },
                { id: "30d", label: STR.dashboard.chart.toggle30d },
              ]}
            />
          }
        >
          <Sparkline data={weekly.map((p) => p.value)} />
        </Card>

        <Card title={STR.dashboard.demographics.title}>
          {demo && (
            <div className="demo">
              <div>
                <h3 className="demo__sub">{STR.dashboard.demographics.gender}</h3>
                {demo.gender.map((g) => (
                  <ProgressBar key={g.label} pct={g.pct} label={g.label} tone="accent" />
                ))}
              </div>
              <div>
                <h3 className="demo__sub">{STR.dashboard.demographics.age}</h3>
                {demo.age.map((a) => (
                  <ProgressBar key={a.label} pct={a.pct} label={a.label} tone="accent" />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="dashboard__row">
        <Card title={STR.dashboard.activeCampaigns.title}>
          <ul className="preview-list" data-testid="dashboard-active-campaigns">
            {activeCampaigns.map((c) => (
              <li key={c.id} className="preview-list__item">
                <span>{c.name}</span>
                <span className="preview-list__meta">{c.location}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={STR.dashboard.liveUsers.title}>
          <ul className="preview-list" data-testid="dashboard-live-users">
            {liveUsers.map((u) => (
              <li key={u.id} className="preview-list__item">
                <span className="preview-list__avatar">{getInitials(u.name)}</span>
                <span>{u.name.split(" ")[0]}</span>
                <span className="preview-list__meta">{u.zone}</span>
                <span className="preview-list__countdown">{formatRelative(u.remaining)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
