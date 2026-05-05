import { STR } from "../strings";
import { Button } from "../ui/Button";
import { postRenew } from "../state/api";

type Props = {
  sessionId: string;
  onRenew: (adSeconds: number) => void;
};

export function RenewScreen({ sessionId, onRenew }: Props) {
  async function handleRenew() {
    try {
      const res = await postRenew(sessionId);
      onRenew(res.campaign.ad_seconds);
    } catch {
      // 404 means the grace window expired; force user back to bootstrap.
      window.location.reload();
    }
  }

  return (
    <main className="screen screen--renew" data-testid="screen-renew">
      <div className="renew__icon" aria-hidden="true">⏰</div>
      <h1 className="renew__headline">{STR.renew.headline}</h1>
      <p className="renew__sub">{STR.renew.sub}</p>
      <div className="renew__stats">
        <div className="renew__stat">
          <span>{STR.renew.statAd}</span>
        </div>
        <div className="renew__stat">
          <span>{STR.renew.statAccess}</span>
        </div>
      </div>
      <Button type="button" onClick={handleRenew} data-testid="renew-cta">
        {STR.renew.cta}
      </Button>
    </main>
  );
}
