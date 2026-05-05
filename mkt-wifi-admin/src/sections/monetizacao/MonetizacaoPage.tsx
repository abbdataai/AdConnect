import { useState } from "react";
import { Card } from "../../ui/Card";
import { EmBreveButton } from "../../ui/EmBreveButton";
import { useMonetizationPlans } from "../../api/monetization";
import { STR } from "../../strings";

export function MonetizacaoPage() {
  const { data: plans = [] } = useMonetizationPlans();
  const [selected, setSelected] = useState<string>("view");

  return (
    <div className="monetizacao">
      <p className="monetizacao__sub">{STR.monetizacao.sub}</p>
      <div className="monetizacao__grid" data-testid="monetization-plans">
        {plans.map((p) => (
          <Card
            key={p.id}
            title={p.name}
            subtitle={p.desc}
          >
            <button
              type="button"
              className={`monetizacao__pick${selected === p.id ? " monetizacao__pick--active" : ""}`}
              onClick={() => setSelected(p.id)}
              data-testid={`monetization-pick-${p.id}`}
            >
              {selected === p.id ? "Selecionado" : "Selecionar"}
            </button>
          </Card>
        ))}
      </div>
      <div className="modal__footer">
        <EmBreveButton blockingSlice="monetization-write">{STR.monetizacao.save}</EmBreveButton>
      </div>
    </div>
  );
}

export default MonetizacaoPage;
