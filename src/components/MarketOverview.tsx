"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Mover = { symbol: string; price: number; changePercent: number };

const STORAGE_KEY = "pt:hideMarketOverview";

export default function MarketOverview() {
  // Default to visible so SSR and first client render match; restore the saved
  // per-user preference (from this browser) right after mount.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setHidden(true);
  }, []);

  function setHiddenPref(next: boolean) {
    setHidden(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  const { data, isLoading } = useSWR<{ movers: Mover[] }>(
    hidden ? null : "/api/market/movers",
    fetcher,
    { refreshInterval: 30_000 }
  );

  if (hidden) {
    return (
      <button
        onClick={() => setHiddenPref(false)}
        className="text-sm text-muted hover:text-text"
      >
        Show market overview
      </button>
    );
  }

  const movers = data?.movers ?? [];

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Market overview</h2>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">Popular stocks · live</span>
          <button
            onClick={() => setHiddenPref(true)}
            className="text-xs text-muted hover:text-text"
            title="Hide this section"
          >
            Hide
          </button>
        </div>
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
