import { useEffect, useState } from "react";
import { STR } from "../strings";
import { formatMmSs, formatTemplate } from "../ui/format";
import type { CampaignAd } from "../state/types";
import { postAdComplete } from "../state/api";
import { AD_COMPLETE_BACKOFF_MS, withRetries } from "../state/retry";
import { Button } from "../ui/Button";

type Props = {
  campaign: CampaignAd;
  sessionId: string;
  adSeconds: number;
  onComplete: (expiresAt: string) => void;
};

type RetryStatus =
  | { kind: "idle" }
  | { kind: "attempting"; attempt: number }
  | { kind: "waiting"; nextAttempt: number; seconds: number }
  | { kind: "failed" };

export function AdScreen({ campaign, sessionId, adSeconds, onComplete }: Props) {
  const [remaining, setRemaining] = useState(adSeconds);
  const [muted, setMuted] = useState(true);
  const [retry, setRetry] = useState<RetryStatus>({ kind: "idle" });
  const [attemptToken, setAttemptToken] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  useEffect(() => {
    if (remaining > 0) return;
    let cancelled = false;
    (async () => {
      const result = await withRetries(
        () => postAdComplete(sessionId),
        AD_COMPLETE_BACKOFF_MS,
        {
          onAttempt: (i) => {
            if (!cancelled) setRetry({ kind: "attempting", attempt: i + 1 });
          },
          onWaiting: (waitMs, nextIndex) => {
            if (!cancelled) {
              setRetry({
                kind: "waiting",
                nextAttempt: nextIndex + 1,
                seconds: Math.ceil(waitMs / 1000),
              });
            }
          },
        },
      );
      if (cancelled) return;
      if (result.ok) {
        onComplete(result.value.expires_at);
      } else {
        setRetry({ kind: "failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [remaining, sessionId, onComplete, attemptToken]);

  const progressPct = adSeconds > 0
    ? ((adSeconds - remaining) / adSeconds) * 100
    : 0;

  if (retry.kind === "failed") {
    return (
      <main className="screen screen--ad-error" data-testid="ad-error-overlay">
        <div className="error-overlay">
          <div className="error-overlay__icon" aria-hidden="true">⚠</div>
          <h1 className="error-overlay__headline">{STR.errors.adCompleteOverlayHeadline}</h1>
          <p className="error-overlay__sub">{STR.errors.adCompleteOverlaySub}</p>
          <Button
            type="button"
            onClick={() => {
              setRetry({ kind: "idle" });
              setAttemptToken((t) => t + 1);
            }}
            data-testid="ad-error-retry"
          >
            {STR.errors.adCompleteOverlayRetryCta}
          </Button>
          <button
            type="button"
            className="error-overlay__reload"
            onClick={() => window.location.reload()}
            data-testid="ad-error-reload"
          >
            {STR.errors.adCompleteOverlayReloadCta}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen screen--ad" data-testid="screen-ad">
      <div className="ad__frame" data-testid="ad-frame">
        <div className="ad__overlay">
          <span className="ad__badge">{STR.ad.badge}</span>
          <button
            type="button"
            className="ad__mute"
            aria-label={muted ? STR.ad.muteOn : STR.ad.muteOff}
            aria-pressed={muted}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
        <div className="ad__creative">
          <h2 className="ad__advertiser">{campaign.advertiser_name}</h2>
          <p className="ad__slogan">{campaign.advertiser_slogan}</p>
        </div>
        <div className="ad__footer">
          <div className="ad__progress" aria-hidden="true">
            <div className="ad__progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="ad__countdown" data-testid="ad-countdown">
            {formatMmSs(remaining)}
          </span>
          <span className="ad__warning">{STR.ad.nonSkippable}</span>
          {retry.kind === "attempting" && (
            <span className="ad__retry-status" role="status" data-testid="ad-retry-status">
              {STR.errors.adCompleteRetrying}
            </span>
          )}
          {retry.kind === "waiting" && (
            <span className="ad__retry-status" role="status" data-testid="ad-retry-status">
              {formatTemplate(STR.errors.adCompleteRetryWaiting, { seconds: retry.seconds })}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

export default AdScreen;
