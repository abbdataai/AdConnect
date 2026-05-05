type Props = {
  data: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ data, width = 320, height = 80 }: Props) {
  if (data.length === 0) return <svg className="sparkline" width={width} height={height} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" strokeWidth={2} className="sparkline__line" />
    </svg>
  );
}
