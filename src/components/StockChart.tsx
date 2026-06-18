"use client";

import { useRef, useState } from "react";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Candle = { t: number; c: number };

const UP = "#16c784";
const DOWN = "#ea3943";

const RANGES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type Range = (typeof RANGES)[number];

function fmtWhen(t: number, range: Range): string {
  const d = new Date(t);
  if (range === "1D" || range === "1W") {
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StockChart({ symbol }: { symbol?: string }) {
  const [range, setRange] = useState<Range>("3M");
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSWR<{ symbol: string; series: Candle[] }>(
    symbol ? `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}` : null,
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
  // Per-point positions as 0..1 fractions, for the hover overlay.
  let pts: { xf: number; yf: number; c: number; t: number }[] = [];

  if (series.length > 1) {
    const ys = series.map((d) => d.c);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min || 1;
    const x = (i: number) => pad + (i / (series.length - 1)) * (w - 2 * pad);
    const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);

    path = series
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.c).toFixed(1)}`)
      .join(" ");
    area = `${path} L ${x(series.length - 1).toFixed(1)} ${h - pad} L ${x(0).toFixed(
      1
    )} ${h - pad} Z`;

    pts = series.map((d, i) => ({
      xf: x(i) / w,
      yf: y(d.c) / h,
      c: d.c,
      t: d.t,
    }));

    const first = ys[0];
    last = ys[ys.length - 1];
    change = last - first;
    changePct = (change / first) * 100;
    up = change >= 0;
  }

  const color = up ? UP : DOWN;
  const hi = hover != null && hover < pts.length ? hover : null;
  const hp = hi != null ? pts[hi] : null;

  function onMove(e: React.MouseEvent) {
    const el = plotRef.current;
    if (!el || pts.length < 2) return;
    const rect = el.getBoundingClientRect();
    const cursorFrac = (e.clientX - rect.left) / rect.width;
    const plotLeft = pad / w;
    const plotWidth = (w - 2 * pad) / w;
    const t = (cursorFrac - plotLeft) / plotWidth;
    const idx = Math.round(Math.min(1, Math.max(0, t)) * (pts.length - 1));
    setHover(idx);
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold">{symbol}</span>
            {(hp ? hp.c : last) > 0 && (
              <span className="font-mono text-lg">{fmtMoney(hp ? hp.c : last)}</span>
            )}
          </div>
          {series.length > 1 && (
            <div className={`text-sm ${pnlClass(change)}`}>
              {hp ? (
                <span className="text-muted">{fmtWhen(hp.t, range)}</span>
              ) : (
                <>
                  {fmtMoney(change, { sign: true })} ({fmtPercent(changePct)}) · {range}
                </>
              )}
            </div>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-panel2 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 ${
                range === r ? "bg-border text-text" : "text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading && series.length === 0 ? (
        <div className="grid h-[240px] place-items-center text-sm text-muted">
          Loading chart…
        </div>
      ) : (
        <div
          ref={plotRef}
          className="relative h-[240px] w-full cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="h-full w-full"
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

          {/* Hover crosshair + marker + tooltip */}
          {hp && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${hp.xf * 100}%` }}
              />
              <div
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg"
                style={{
                  left: `${hp.xf * 100}%`,
                  top: `${hp.yf * 100}%`,
                  backgroundColor: color,
                }}
              />
              <div
                className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-panel2 px-2 py-1 text-center shadow-lg"
                style={{ left: `${Math.min(Math.max(hp.xf, 0.1), 0.9) * 100}%` }}
              >
                <div className="font-mono text-sm font-semibold">{fmtMoney(hp.c)}</div>
                <div className="text-[10px] text-muted">{fmtWhen(hp.t, range)}</div>
              </div>
            </>
          )}
        </div>
      )}
      <p className="mt-2 text-right text-[11px] text-muted">
        Illustrative price history · for paper trading only
      </p>
    </div>
  );
}
