import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Field } from "../../ui/Field";
import { Card } from "../../ui/Card";
import { useUsers } from "../../api/users";
import { STR } from "../../strings";
import { getInitials } from "../../utils/format";
import type { Lead } from "../../types/api";

export function UsuariosPage() {
  const [params, setParams] = useSearchParams();
  const zone = params.get("zone") || "";
  const q = params.get("q") || "";
  const { data: users = [] } = useUsers({ zone: zone || undefined, q: q || undefined });
  const [selected, setSelected] = useState<Lead | null>(null);

  const setQuery = (k: "zone" | "q", v: string) => {
    const next = new URLSearchParams(params);
    if (!v) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const total = users.length;
  const avgAge = total ? Math.round(users.reduce((s, u) => s + u.age, 0) / total) : 0;
  const femPct = total ? Math.round((users.filter((u) => u.gender === "F" || u.gender === "Feminino").length / total) * 100) : 0;

  return (
    <div className="usuarios">
      <div className="usuarios__filters">
        <Field
          kind="text"
          label={STR.usuarios.search}
          value={q}
          placeholder={STR.usuarios.search}
          onChange={(v) => setQuery("q", v)}
          testId="users-search"
        />
        <Field
          kind="select"
          label="Zona"
          value={zone}
          options={[STR.usuarios.zoneAll, ...STR.usuarios.zones]}
          onChange={(v) => setQuery("zone", v === STR.usuarios.zoneAll ? "" : v)}
          testId="users-zone"
        />
      </div>

      <div className="usuarios__kpis">
        <div className="kpi"><div className="kpi__label">{STR.usuarios.kpi.total}</div><div className="kpi__value">{total}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.usuarios.kpi.avgAge}</div><div className="kpi__value">{avgAge}</div></div>
        <div className="kpi"><div className="kpi__label">{STR.usuarios.kpi.femPct}</div><div className="kpi__value">{femPct}%</div></div>
      </div>

      <Card>
        <table className="usuarios__table" data-testid="users-table">
          <thead>
            <tr>
              <th>{STR.usuarios.columns.name}</th>
              <th>{STR.usuarios.columns.age}</th>
              <th>{STR.usuarios.columns.gender}</th>
              <th>{STR.usuarios.columns.zone}</th>
              <th>{STR.usuarios.columns.lastConnection}</th>
              <th>{STR.usuarios.columns.connections}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const firstName = u.name.trim().split(/\s+/)[0] || u.name;
              return (
                <tr key={u.id} onClick={() => setSelected(u)} className="usuarios__row">
                  <td><span className="preview-list__avatar">{getInitials(firstName)}</span> {firstName}</td>
                  <td>{u.age}</td>
                  <td>{u.gender}</td>
                  <td>{u.zone}</td>
                  <td>{u.lastConnection}</td>
                  <td>{u.connections}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <aside className="drawer" onClick={() => setSelected(null)}>
          <div className="drawer__panel" onClick={(e) => e.stopPropagation()} data-testid="lead-detail">
            <header className="drawer__header">
              <h2>{STR.usuarios.detail.title}</h2>
              <button type="button" className="modal__close" onClick={() => setSelected(null)} aria-label="Fechar">×</button>
            </header>
            <dl className="drawer__list">
              <dt>{STR.usuarios.columns.name}</dt><dd>{selected.name.trim().split(/\s+/)[0]}</dd>
              <dt>{STR.usuarios.columns.age}</dt><dd>{selected.age}</dd>
              <dt>{STR.usuarios.columns.gender}</dt><dd>{selected.gender}</dd>
              <dt>{STR.usuarios.columns.zone}</dt><dd>{selected.zone}</dd>
              <dt>{STR.usuarios.columns.lastConnection}</dt><dd>{selected.lastConnection}</dd>
              <dt>{STR.usuarios.columns.connections}</dt><dd>{selected.connections}</dd>
            </dl>
          </div>
        </aside>
      )}
    </div>
  );
}
