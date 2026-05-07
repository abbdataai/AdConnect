import { Card } from "../../ui/Card";
import { Pill } from "../../ui/Pill";
import { useNotifRules, useToggleRule, useNotifGroups } from "../../api/notifications";
import { useToastsStore } from "../../stores/toasts";
import { useAuthStore } from "../../stores/auth";
import { STR } from "../../strings";

export function NotificacoesPage() {
  const { data: rules = [] } = useNotifRules();
  const { data: groups = [] } = useNotifGroups();
  const toggle = useToggleRule();
  const enqueue = useToastsStore((s) => s.enqueue);
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  return (
    <div className="notificacoes">
      <Card title={STR.notificacoes.rulesTitle}>
        <ul className="rule-list" data-testid="notif-rules">
          {rules.map((r) => {
            const desc = r.title === "Expiração de acesso" ? "Notifica grupo Operação 5 minutos antes" : r.desc;
            return (
              <li key={r.id} className="rule-list__item">
                <Pill tone="neutral">{r.channel}</Pill>
                <div className="rule-list__text">
                  <strong>{r.title}</strong>
                  <span>{desc}</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={r.active}
                    disabled={!isAdmin}
                    onChange={async (e) => {
                      await toggle.mutateAsync({ id: r.id, active: e.target.checked });
                      enqueue(e.target.checked ? STR.notificacoes.activeOn : STR.notificacoes.activeOff);
                    }}
                    data-testid={`rule-toggle-${r.id}`}
                  />
                  <span className="switch__slider" />
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={STR.notificacoes.groupsTitle}>
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.id} className="group-list__item">
              <strong>{g.name}</strong>
              <span>{g.members} {STR.notificacoes.membersLabel}</span>
              <span className="group-list__desc">{g.desc}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
