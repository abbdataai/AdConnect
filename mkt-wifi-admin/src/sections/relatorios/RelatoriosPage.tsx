import { Card } from "../../ui/Card";
import { Pill } from "../../ui/Pill";
import { useReports } from "../../api/reports";
import { STR } from "../../strings";

export function RelatoriosPage() {
  const { data: reports = [] } = useReports();
  return (
    <div className="relatorios">
      <Card>
        <table className="relatorios__table" data-testid="reports-table">
          <thead>
            <tr>
              <th>{STR.relatorios.columns.name}</th>
              <th>{STR.relatorios.columns.date}</th>
              <th>{STR.relatorios.columns.type}</th>
              <th>{STR.relatorios.columns.size}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.date}</td>
                <td><Pill tone="neutral">{r.type}</Pill></td>
                <td>{r.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default RelatoriosPage;
