type Props = { children: string };

export function Pill({ children }: Props) {
  return <span className="pill">{children}</span>;
}
