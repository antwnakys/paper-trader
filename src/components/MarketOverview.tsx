"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Mover = { symbol: string; price: number; changePercent: number };

export default function MarketOverview() {
  const { data, isLoading } = useSWR<{ movers: Mover[] }>(
    "/api/market/movers",
    fetcher,
    { refreshInterval: 30_000 }
  );

  const movers = data?.movers ?? [];

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Market overview</h2>
        <span className="text-xs text-muted">Popular stocks · live</span>
      </div>

      {isLoading && movers.length === 0 ? (
        <p className="text-sm text-muted">Loading market data…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {movers.map((m) => (
            <div key={m.symbol} className="rounded-lg border border-border bg-panel2 p-3">
              <div className="font-mono text-sm font-semibold">{m.symbol}</div>
              <div className="font-mono text-sm">{fmtMoney(m.price)}</div>
              <div className={`text-xs font-medium ${pnlClass(m.changePercent)}`}>
                {fmtPercent(m.changePercent)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
