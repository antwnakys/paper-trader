"use client";

const UP = "#16c784";
const DOWN = "#ea3943";

export default function Sparkline({
  data,
  baseline,
  className = "h-10 w-full",
}: {
  data: { equity: number }[];
  baseline: number;
  className?: string;
}) {
  if (!data || data.length < 2) {
    return <div className={className} />;
  }

  const w = 200;
  const h = 40;
  const pad = 2;
  const ys = data.map((d) => d.equity);
  const min = Math.min(...ys, baseline);
  const max = Math.max(...ys, baseline);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);

  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.equity).toFixed(1)}`)
    .join(" ");

  const up = ys[ys.length - 1] >= baseline;
  const color = up ? UP : DOWN;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <line
        x1={pad}
        x2={w - pad}
        y1={y(baseline)}
        y2={y(baseline)}
        stroke="#2a3142"
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
