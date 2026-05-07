import { useEffect, useState } from "react";
import { STR } from "../strings";
import { formatTemplate } from "../ui/format";

const STEP_DURATIONS_MS = [1400, 1000, 700];

type Props = {
  ssid: string;
  onComplete: () => void;
};

export function ConnectingScreen({ ssid, onComplete }: Props) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STEP_DURATIONS_MS.length) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setStage(stage + 1), STEP_DURATIONS_MS[stage]);
    return () => clearTimeout(timer);
  }, [stage, onComplete]);

  const visibleStage = Math.min(stage, STR.connecting.seq.length - 1);
  const message = STR.connecting.seq[visibleStage]!;
  const subtitle = formatTemplate(message.subtitle, { ssid });

  return (
    <main className="screen screen--connecting" data-testid="screen-connecting">
      <div className="connecting__radar" aria-hidden="true">
        <div className="connecting__radar-dot" />
      </div>
      <h1 className="connecting__title">{message.title}</h1>
      <p className="connecting__subtitle">{subtitle}</p>
      <div className="connecting__dots" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`connecting__dot${i === 0 ? " connecting__dot--active" : ""}`}
          />
        ))}
      </div>
    </main>
  );
}
