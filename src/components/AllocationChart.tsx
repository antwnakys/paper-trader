"use client";

import { fmtMoney } from "@/lib/format";

const COLORS = [
  "#3b82f6",
  "#16c784",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#ef4444",
  "#14b8a6",
];
const CASH_COLOR = "#64748b";

export default function AllocationChart({
  positions,
  cash,
}: {
  positions: { symbol: string; marketValue: number }[];
  cash: number;
}) {
  const slices = [
    ...positions
      .filter((p) => p.marketValue > 0)
      .map((p, i) => ({
        label: p.symbol,
        value: p.marketValue,
        color: COLORS[i % COLORS.length],
      })),
    ...(cash > 0 ? [{ label: "Cash", value: cash, color: CASH_COLOR }] : []),
  ].sort((a, b) => b.value - a.value);

  const total = slices.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    return (
      <div className="card grid h-48 place-items-center p-5 text-center text-sm text-muted">
        Allocation will appear here once your account has value.
      </div>
    );
  }

  const r = 50;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="card p-5">
      <div className="mb-3 font-semibold">Allocation</div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0">
          <g transform="rotate(-90 60 60)">
            {slices.map((d) => {
              const len = (d.value / total) * C;
              const el = (
                <circle
                  key={d.label}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
          </g>
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fill="#8b94a7"
            style={{ fontSize: 7 }}
          >
            TOTAL
          </text>
          <text
            x="60"
            y="68"
            textAnchor="middle"
            fill="#e6e9ef"
            style={{ fontSize: 9, fontWeight: 600, fontFamily: "monospace" }}
          >
            {fmtMoney(total)}
          </text>
        </svg>

        <ul className="w-full space-y-1.5 text-sm">
          {slices.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <span className="font-mono">{d.label}</span>
              </span>
              <span className="flex items-center gap-2 text-right">
                <span className="text-muted">
                  {((d.value / total) * 100).toFixed(1)}%
                </span>
                <span className="font-mono">{fmtMoney(d.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
