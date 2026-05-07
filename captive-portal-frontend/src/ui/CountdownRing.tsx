import { formatMmSs } from "./format";

type Props = {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
};

export function CountdownRing({ remainingSeconds, totalSeconds, size = 200 }: Props) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  const offset = circumference * (1 - ratio);
  const center = size / 2;
  return (
    <svg
      className="countdown"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Tempo restante"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        className="countdown__track"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        className="countdown__progress"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        className="countdown__label"
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {formatMmSs(remainingSeconds)}
      </text>
    </svg>
  );
}
