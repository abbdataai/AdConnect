import { useEffect, useState } from "react";
import { STR } from "../strings";
import { CountdownRing } from "../ui/CountdownRing";
import { formatTemplate, getFirstName } from "../ui/format";

const TOTAL_SECONDS = 1800;

type Props = {
  firstName: string;
  expiresAt: string;
  onExpired: () => void;
};

function computeRemaining(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export function ConnectedScreen({ firstName, expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState(() => computeRemaining(expiresAt));

  useEffect(() => {
    const id = setInterval(() => {
      const next = computeRemaining(expiresAt);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const headline = formatTemplate(STR.connected.headlineTemplate, {
    firstName: getFirstName(firstName),
  });

  return (
    <main className="screen screen--connected" data-testid="screen-connected">
      <div className="connected__check" aria-hidden="true">✓</div>
      <span className="connected__eyebrow">{STR.connected.eyebrow}</span>
      <h1 className="connected__headline" data-testid="connected-headline">
        {headline}
      </h1>
      <p className="connected__sub">{STR.connected.sub}</p>
      <CountdownRing remainingSeconds={remaining} totalSeconds={TOTAL_SECONDS} />
      <section className="connected__info-card">
        <h2 className="connected__info-title">{STR.connected.infoCardTitle}</h2>
        <p className="connected__info-body">{STR.connected.infoCardBody}</p>
      </section>
      <p className="connected__foot">{STR.connected.foot}</p>
    </main>
  );
}
