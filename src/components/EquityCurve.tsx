"use client";

import { useRef, useState } from "react";

import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Point = { t: number; equity: number };

const UP = "#16c784";
const DOWN = "#ea3943";

function fmtWhen(t: number): string {
  return new Date(t).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EquityCurve({
  history,
  startingBalance,
}: {
  history: Point[];
  startingBalance: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const w = 720;
  const h = 200;
  const pad = 10;

  if (!history || history.length < 2) {
    return (
      <div className="card grid h-48 place-items-center p-5 text-center text-sm text-muted">
        Your account value curve will appear here as you trade.
      </div>
    );
  }

  const eq = history.map((p) => p.equity);
  // Include the starting balance in the range so the baseline is visible.
  const min = Math.min(...eq, startingBalance);
  const max = Math.max(...eq, startingBalance);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (history.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);

  const line = history
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.equity).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(history.length - 1).toFixed(1)} ${h - pad} L ${x(0).toFixed(
    1
  )} ${h - pad} Z`;

  const current = eq[eq.length - 1];
  const change = current - startingBalance;
  const changePct = startingBalance > 0 ? (change / startingBalance) * 100 : 0;
  const up = change >= 0;
  const color = up ? UP : DOWN;

  const baselineY = y(startingBalance);

  const pts = history.map((p, i) => ({ xf: x(i) / w, yf: y(p.equity) / h, ...p }));
  const hi = hover != null && hover < pts.length ? hover : null;
  const hp = hi != null ? pts[hi] : null;

  function onMove(e: React.MouseEvent) {
    const el = plotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const t = (frac - pad / w) / ((w - 2 * pad) / w);
    setHover(Math.round(Math.min(1, Math.max(0, t)) * (history.length - 1)));
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Account value</div>
          <div className="font-mono text-xl font-semibold">
            {fmtMoney(hp ? hp.equity : current)}
          </div>
        </div>
        <div className={`text-sm ${pnlClass(change)}`}>
          {hp ? (
            <span className="text-muted">{fmtWhen(hp.t)}</span>
          ) : (
            <>
              {fmtMoney(change, { sign: true })} ({fmtPercent(changePct)}) all-time
            </>
          )}
        </div>
      </div>

      <div
        ref={plotRef}
        className="relative h-[200px] w-full cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Starting-balance baseline */}
          <line
            x1={pad}
            x2={w - pad}
            y1={baselineY}
            y2={baselineY}
            stroke="#8b94a7"
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path d={area} fill="url(#eq-grad)" />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>

        {hp && (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${hp.xf * 100}%` }}
            />
            <div
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg"
              style={{ left: `${hp.xf * 100}%`, top: `${hp.yf * 100}%`, backgroundColor: color }}
            />
          </>
        )}
      </div>
      <p className="mt-2 text-right text-[11px] text-muted">
        Dashed line = starting balance · snapshots recorded as you use the account
      </p>
    </div>
  );
}
