type Props = {
  pct: number;
  label?: string;
  tone?: "ok" | "warn" | "err" | "accent";
};

export function ProgressBar({ pct, label, tone = "accent" }: Props) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="progress">
      {label !== undefined && (
        <div className="progress__row">
          <span className="progress__label">{label}</span>
          <span className="progress__pct">{safe}%</span>
        </div>
      )}
      <div className="progress__track">
        <div className={`progress__fill progress__fill--${tone}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
