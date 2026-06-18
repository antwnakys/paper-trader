"use client";

import { useState } from "react";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Candle = { t: number; c: number };

const UP = "#16c784";
const DOWN = "#ea3943";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

export default function StockChart({ symbol }: { symbol?: string }) {
  const [days, setDays] = useState(90);

  const { data, isLoading } = useSWR<{ symbol: string; series: Candle[] }>(
    symbol ? `/api/chart?symbol=${encodeURIComponent(symbol)}&days=${days}` : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  if (!symbol) {
    return (
      <div className="card grid h-72 place-items-center p-5 text-center text-sm text-muted">
        Select a position or buy a stock to see its price chart.
      </div>
    );
  }

  const series = data?.series ?? [];
  const w = 720;
  const h = 240;
  const pad = 10;

  let path = "";
  let area = "";
  let change = 0;
  let changePct = 0;
  let last = 0;
  let up = true;

  if (series.length > 1) {
    const ys = series.map((d) => d.c);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const range = max - min || 1;
    const x = (i: number) => pad + (i / (series.length - 1)) * (w - 2 * pad);
    const y = (v: number) => pad + (1 - (v - min) / range) * (h - 2 * pad);

    path = series
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.c).toFixed(1)}`)
      .join(" ");
    area = `${path} L ${x(series.length - 1).toFixed(1)} ${h - pad} L ${x(0).toFixed(
      1
    )} ${h - pad} Z`;

    const first = ys[0];
    last = ys[ys.length - 1];
    change = last - first;
    changePct = (change / first) * 100;
    up = change >= 0;
  }

  const color = up ? UP : DOWN;

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold">{symbol}</span>
            {last > 0 && (
              <span className="font-mono text-lg">{fmtMoney(last)}</span>
            )}
          </div>
          {series.length > 1 && (
            <div className={`text-sm ${pnlClass(change)}`}>
              {fmtMoney(change, { sign: true })} ({fmtPercent(changePct)}) ·{" "}
              {RANGES.find((r) => r.days === days)?.label ?? `${days}d`}
            </div>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-panel2 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              className={`rounded-md px-3 py-1 ${
                days === r.days ? "bg-border text-text" : "text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && series.length === 0 ? (
        <div className="grid h-[240px] place-items-center text-sm text-muted">
          Loading chart…
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[240px] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill={`url(#grad-${symbol})`} />}
          {path && (
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      <p className="mt-2 text-right text-[11px] text-muted">
        Illustrative price history · for paper trading only
      </p>
    </div>
  );
}
