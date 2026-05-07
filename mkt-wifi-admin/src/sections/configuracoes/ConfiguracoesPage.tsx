import { Card } from "../../ui/Card";
import { Pill } from "../../ui/Pill";
import { EmBreveButton } from "../../ui/EmBreveButton";
import { STR } from "../../strings";

const FIXTURE_EMPRESA = {
  razaoSocial: "MKT WiFi Operações Ltda.",
  cnpj: "00.000.000/0001-00",
  contactEmail: "contato@mktwifi.com.br",
};

const INTEGRATIONS = [
  { id: "whatsapp", label: STR.configuracoes.integracoes.whatsapp, status: STR.configuracoes.integracoes.connected },
  { id: "smtp", label: STR.configuracoes.integracoes.smtp, status: STR.configuracoes.integracoes.connected },
  { id: "mikrotik", label: STR.configuracoes.integracoes.mikrotik, status: STR.configuracoes.integracoes.connected },
  { id: "youtube", label: STR.configuracoes.integracoes.youtube, status: STR.configuracoes.integracoes.connected },
];

export function ConfiguracoesPage() {
  return (
    <div className="configuracoes">
      <Card title={STR.configuracoes.empresa.title}>
        <dl className="config-list">
          <dt>{STR.configuracoes.empresa.razaoSocial}</dt><dd>{FIXTURE_EMPRESA.razaoSocial}</dd>
          <dt>{STR.configuracoes.empresa.cnpj}</dt><dd>{FIXTURE_EMPRESA.cnpj}</dd>
          <dt>{STR.configuracoes.empresa.contactEmail}</dt><dd>{FIXTURE_EMPRESA.contactEmail}</dd>
        </dl>
        <div className="modal__footer">
          <EmBreveButton blockingSlice="multi-tenant-empresa">Salvar empresa</EmBreveButton>
        </div>
      </Card>

      <Card title={STR.configuracoes.integracoes.title}>
        <ul className="integrations">
          {INTEGRATIONS.map((i) => (
            <li key={i.id} className="integrations__item">
              <span>{i.label}</span>
              <Pill tone="ok">{i.status}</Pill>
            </li>
          ))}
        </ul>
        <div className="modal__footer">
          <EmBreveButton blockingSlice="multi-tenant-integrations">Salvar integrações</EmBreveButton>
        </div>
      </Card>
    </div>
  );
}

export default ConfiguracoesPage;
