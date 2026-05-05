type Props = { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "err" };

export function Pill({ children, tone = "neutral" }: Props) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
