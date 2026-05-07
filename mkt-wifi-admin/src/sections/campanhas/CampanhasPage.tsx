import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs } from "../../ui/Tabs";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { Field } from "../../ui/Field";
import { StatusBadge } from "../../ui/StatusBadge";
import { Card } from "../../ui/Card";
import {
  useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign,
} from "../../api/campaigns";
import { useToastsStore } from "../../stores/toasts";
import { useAuthStore } from "../../stores/auth";
import type { Campaign, CampaignCreate, CampaignStatus } from "../../types/api";
import { STR } from "../../strings";
import { formatBRL } from "../../utils/format";

const STATUS_TABS = [
  { id: "all" as const, label: STR.campanhas.filters.all },
  { id: "active" as const, label: STR.campanhas.filters.active },
  { id: "paused" as const, label: STR.campanhas.filters.paused },
  { id: "ended" as const, label: STR.campanhas.filters.ended },
];

export function CampanhasPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = (params.get("status") || "all") as "all" | CampaignStatus;
  const view = (params.get("view") || "cards") as "cards" | "table";
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const { data: campaigns = [] } = useCampaigns(
    statusParam === "all" ? {} : { status: statusParam },
  );
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const del = useDeleteCampaign();
  const enqueue = useToastsStore((s) => s.enqueue);

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const totalActive = campaigns.filter((c) => c.status === "active").length;
  const totalViews = campaigns.reduce((s, c) => s + c.views, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const avgCompletion = campaigns.length
    ? Math.round(campaigns.reduce((s, c) => s + c.completion, 0) / campaigns.length)
    : 0;

  function setQuery(next: Partial<{ status: string; view: string }>) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all" || v === "cards") merged.delete(k);
      else merged.set(k, v);
    });
    setParams(merged, { replace: true });
  }

  return (
    <div className="campanhas">
      <div className="campanhas__header">
        <Tabs value={statusParam} onChange={(s) => setQuery({ status: s })} options={STATUS_TABS} />
        <div className="campanhas__view-toggle">
          <Button variant={view === "cards" ? "primary" : "ghost"} onClick={() => setQuery({ view: "cards" })}>
            {STR.campanhas.view.cards}
          </Button>
          <Button variant={view === "table" ? "primary" : "ghost"} onClick={() => setQuery({ view: "table" })}>
            {STR.campanhas.view.table}
          </Button>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowNew(true)} data-testid="campanhas-new">
            {STR.topbar.novaCampanha}
          </Button>
        )}
      </div>

      <div className="campanhas__kpis">
        <div className="kpi"><div className="kpi__label">{STR.campanhas.kpi.total}</div><div className="kpi__value">{campaigns.length}</div><div className="kpi__delta">{totalActive} {STR.campanhas.kpi.active}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.campanhas.kpi.views}</div><div className="kpi__value">{totalViews.toLocaleString("pt-BR")}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.campanhas.kpi.revenue}</div><div className="kpi__value">{formatBRL(totalRevenue)}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.campanhas.kpi.completion}</div><div className="kpi__value">{avgCompletion}%</div></div>
      </div>

      {view === "cards" ? (
        <div className="campanhas__grid">
          {campaigns.map((c) => (
            <Card key={c.id} title={c.name} subtitle={c.location} actions={<StatusBadge status={c.status} />}>
              <div className="campaign-card__meta">
                <span>{c.duration}s</span>
                <span>{c.source}</span>
                <span className="campaign-card__reward">{STR.campanhas.rewardTag}</span>
              </div>
              <div className="campaign-card__kpis">
                <div><span>Visualizações</span><strong>{c.views.toLocaleString("pt-BR")}</strong></div>
                <div><span>Conclusão</span><strong>{c.completion}%</strong></div>
                <div><span>Receita</span><strong>{formatBRL(c.revenue)}</strong></div>
              </div>
              {isAdmin && (
                <div className="campaign-card__actions">
                  <Button variant="ghost" onClick={() => setEditing(c)}>{STR.campanhas.actions.edit}</Button>
                  {c.status === "active" && (
                    <Button variant="ghost" onClick={async () => {
                      await update.mutateAsync({ id: c.id, body: { status: "paused" } });
                      enqueue(STR.campanhas.toast.paused);
                    }}>{STR.campanhas.actions.pause}</Button>
                  )}
                  {c.status === "paused" && (
                    <Button variant="ghost" onClick={async () => {
                      await update.mutateAsync({ id: c.id, body: { status: "active" } });
                      enqueue(STR.campanhas.toast.reactivated);
                    }}>{STR.campanhas.actions.reactivate}</Button>
                  )}
                  {c.status === "ended" && (
                    <Button variant="ghost" onClick={() => enqueue(STR.campanhas.toast.duplicated)}>{STR.campanhas.actions.duplicate}</Button>
                  )}
                  <Button variant="danger" onClick={async () => {
                    await del.mutateAsync(c.id);
                    enqueue(STR.campanhas.toast.deleted);
                  }} data-testid={`campaign-delete-${c.id}`}>
                    {STR.campanhas.actions.delete}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <table className="campanhas__table">
          <thead>
            <tr><th>Nome</th><th>Local</th><th>Status</th><th>Visualizações</th><th>Receita</th></tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.location}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{c.views.toLocaleString("pt-BR")}</td>
                <td>{formatBRL(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <NewCampaignModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={async (body) => {
          await create.mutateAsync(body);
          enqueue(STR.campanhas.toast.created);
          setShowNew(false);
        }}
      />
      {editing && (
        <EditCampaignModal
          campaign={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (id, body) => {
            await update.mutateAsync({ id, body });
            enqueue(STR.campanhas.toast.updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function NewCampaignModal({
  open, onClose, onSubmit,
}: { open: boolean; onClose: () => void; onSubmit: (body: CampaignCreate) => Promise<void> }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Centro");
  const [duration, setDuration] = useState("30");
  const [source, setSource] = useState<"YouTube" | "Upload">("YouTube");
  const isValid = name.trim().length >= 3 && Number(duration) > 0;
  return (
    <Modal open={open} onClose={onClose} title={STR.campanhas.modal.newTitle}>
      <Field kind="text" label={STR.campanhas.modal.name} value={name} onChange={setName} required />
      <Field kind="select" label={STR.campanhas.modal.location} value={location} onChange={setLocation} options={["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste", "Praia"]} />
      <Field kind="number" label={STR.campanhas.modal.duration} value={duration} onChange={setDuration} />
      <Field kind="select" label={STR.campanhas.modal.source} value={source} onChange={(v) => setSource(v as "YouTube" | "Upload")} options={["YouTube", "Upload"]} />
      <div className="modal__footer">
        <Button variant="ghost" onClick={onClose}>{STR.campanhas.modal.cancel}</Button>
        <Button
          disabled={!isValid}
          onClick={() => onSubmit({ name: name.trim(), location, duration: Number(duration), source })}
          data-testid="new-campaign-save"
        >
          {STR.campanhas.modal.save}
        </Button>
      </div>
    </Modal>
  );
}

function EditCampaignModal({
  campaign, onClose, onSubmit,
}: { campaign: Campaign; onClose: () => void; onSubmit: (id: string, body: { status: CampaignStatus; name: string }) => Promise<void> }) {
  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  return (
    <Modal open onClose={onClose} title={STR.campanhas.modal.editTitle}>
      <Field kind="text" label={STR.campanhas.modal.name} value={name} onChange={setName} required />
      <Field kind="select" label={STR.campanhas.modal.status} value={status} onChange={(v) => setStatus(v as CampaignStatus)} options={["active", "paused", "ended"]} />
      <div className="modal__footer">
        <Button variant="ghost" onClick={onClose}>{STR.campanhas.modal.cancel}</Button>
        <Button onClick={() => onSubmit(campaign.id, { status, name: name.trim() })}>{STR.campanhas.modal.save}</Button>
      </div>
    </Modal>
  );
}
