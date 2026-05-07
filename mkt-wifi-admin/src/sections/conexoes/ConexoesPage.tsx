import { useState } from "react";
import { Card } from "../../ui/Card";
import { Field } from "../../ui/Field";
import { EmBreveButton } from "../../ui/EmBreveButton";
import { Pill } from "../../ui/Pill";
import { STR } from "../../strings";

export function ConexoesPage() {
  const [ip, setIp] = useState("192.168.88.1");
  const [port, setPort] = useState("8728");
  const [user, setUser] = useState("admin");
  const [pwd, setPwd] = useState("");
  const [minutes, setMinutes] = useState("30");

  return (
    <div className="conexoes">
      <Card
        title={STR.conexoes.fields.title}
        subtitle={STR.conexoes.fields.subtitle}
      >
        <ul className="conexoes__fields" data-testid="conexoes-fields-summary">
          {STR.conexoes.fields.list.map((f) => (
            <li key={f.id} className="conexoes__field">
              <span className="conexoes__field-label">{f.label}</span>
              <span className="conexoes__field-type">{f.type}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={STR.conexoes.mikrotik.title}
        actions={
          <div className="conexoes__badges">
            <Pill tone="ok">{STR.conexoes.mikrotik.hotspotActive}</Pill>
            <Pill tone="neutral">{STR.conexoes.mikrotik.redirect}: {ip}</Pill>
            <Pill tone="neutral">{minutes} {STR.conexoes.mikrotik.sessionLabel}</Pill>
          </div>
        }
      >
        <Field kind="text" label={STR.conexoes.mikrotik.ip} value={ip} onChange={setIp} />
        <Field kind="number" label={STR.conexoes.mikrotik.port} value={port} onChange={setPort} />
        <Field kind="text" label={STR.conexoes.mikrotik.user} value={user} onChange={setUser} />
        <Field kind="password" label={STR.conexoes.mikrotik.password} value={pwd} onChange={setPwd} />
        <Field kind="number" label={STR.conexoes.mikrotik.session} value={minutes} onChange={setMinutes} />
        <div className="modal__footer">
          <EmBreveButton blockingSlice="network-config-write">{STR.conexoes.mikrotik.save}</EmBreveButton>
        </div>
      </Card>
    </div>
  );
}
