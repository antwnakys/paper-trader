"use client";

import { useState } from "react";
import useSWR from "swr";

import { fetcher, postJson, del } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Item = { symbol: string; price: number | null; changePercent: number | null };

export default function Watchlist({
  active,
  onPick,
}: {
  active?: string;
  onPick: (symbol: string) => void;
}) {
  const { data, mutate, isLoading } = useSWR<{ watchlist: Item[] }>(
    "/api/watchlist",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const [busy, setBusy] = useState(false);

  const items = data?.watchlist ?? [];
  const alreadyWatching = active ? items.some((i) => i.symbol === active) : false;

  async function add() {
    if (!active) return;
    setBusy(true);
    try {
      await postJson("/api/watchlist", { symbol: active });
      mutate();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function remove(symbol: string) {
    await del(`/api/watchlist/${encodeURIComponent(symbol)}`);
    mutate();
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Watchlist</h2>
        {active && !alreadyWatching && (
          <button
            onClick={add}
            disabled={busy}
            className="text-xs text-brand hover:underline disabled:opacity-50"
          >
            + Add {active}
          </button>
        )}
      </div>

      {isLoading && items.length === 0 ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">
          No symbols yet. Pick a stock and tap “Add” to follow it.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((i) => (
            <li
              key={i.symbol}
              className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-panel2 ${
                i.symbol === active ? "bg-panel2" : ""
              }`}
              onClick={() => onPick(i.symbol)}
            >
              <span className="font-mono text-sm font-medium">{i.symbol}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-sm">
                  {i.price != null ? fmtMoney(i.price) : "—"}
                </span>
                <span
                  className={`w-16 text-right font-mono text-xs ${pnlClass(
                    i.changePercent ?? 0
                  )}`}
                >
                  {i.changePercent != null ? fmtPercent(i.changePercent) : "—"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(i.symbol);
                  }}
                  className="text-muted opacity-0 transition-opacity hover:text-down group-hover:opacity-100"
                  title={`Remove ${i.symbol}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
