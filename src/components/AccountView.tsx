"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { fetcher, postJson } from "@/lib/fetcher";
import { fmtMoney, fmtNumber, fmtPercent, pnlClass } from "@/lib/format";
import TradeTicket from "@/components/TradeTicket";
import StockChart from "@/components/StockChart";
import EquityCurve from "@/components/EquityCurve";
import PromptDialog from "@/components/PromptDialog";

type AccountData = {
  portfolio: {
    id: string;
    name: string;
    startingBalance: number;
    cash: number;
    createdAt: string;
  };
  positions: {
    id: string;
    symbol: string;
    quantity: number;
    avgCost: number;
    price: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
    changePercent: number;
    simulated: boolean;
  }[];
  trades: {
    id: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    realizedPnl: number;
    createdAt: string;
  }[];
  equityHistory: { t: number; equity: number }[];
  summary: {
    cash: number;
    holdingsValue: number;
    equity: number;
    totalReturn: number;
    totalReturnPercent: number;
    realizedPnl: number;
  };
};

export default function AccountView({ portfolioId }: { portfolioId: string }) {
  const { data, error, isLoading, mutate } = useSWR<AccountData>(
    `/api/portfolios/${portfolioId}`,
    fetcher,
    { refreshInterval: 10000 }
  );
  // The "active" symbol drives both the chart and the trade ticket.
  const [active, setActive] = useState<string | undefined>();
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Default the active symbol to the first holding once data loads; never
  // override a selection the user has already made.
  useEffect(() => {
    const first = data?.positions?.[0]?.symbol;
    if (first) setActive((cur) => cur ?? first);
  }, [data]);

  if (isLoading) return <p className="mt-8 text-muted">Loading account…</p>;
  if (error || !data) return <p className="mt-8 text-down">Failed to load account.</p>;

  const { portfolio, positions, trades, summary } = data;

  async function doReset(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      setResetError("Enter a valid positive starting balance.");
      return;
    }
    setResetError(null);
    setResetting(true);
    try {
      await postJson(`/api/portfolios/${portfolioId}/reset`, { startingBalance: n });
      setResetOpen(false);
      setActive(undefined);
      mutate();
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="mt-4">
      {/* Header + summary */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          <p className="text-sm text-muted">
            Started with {fmtMoney(portfolio.startingBalance)}
          </p>
        </div>
        <button
          onClick={() => {
            setResetError(null);
            setResetOpen(true);
          }}
          disabled={resetting}
          className="btn-ghost"
        >
          {resetting ? "Resetting…" : "Reset account"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_1fr_360px]">
        {/* Left: account stats sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label="Equity" value={fmtMoney(summary.equity)} />
            <Stat label="Cash" value={fmtMoney(summary.cash)} />
            <Stat
              label="Total return"
              value={fmtMoney(summary.totalReturn, { sign: true })}
              sub={fmtPercent(summary.totalReturnPercent)}
              tone={summary.totalReturn}
            />
            <Stat
              label="Realized P&L"
              value={fmtMoney(summary.realizedPnl, { sign: true })}
              tone={summary.realizedPnl}
            />
          </div>
        </aside>

        {/* Middle: equity curve + chart + positions + history */}
        <div className="min-w-0 space-y-6">
          <EquityCurve
            history={data.equityHistory}
            startingBalance={portfolio.startingBalance}
          />
          <StockChart symbol={active} />
          <Positions positions={positions} active={active} onPick={setActive} />
          <History trades={trades} />
        </div>

        {/* Right: trade ticket */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <TradeTicket
            portfolioId={portfolioId}
            cash={summary.cash}
            presetSymbol={active}
            onDone={() => mutate()}
          />
        </div>
      </div>

      <PromptDialog
        open={resetOpen}
        title="Reset account"
        message="This wipes all positions and trade history, then restores cash to the starting balance below."
        label="New starting balance ($)"
        type="number"
        defaultValue={String(portfolio.startingBalance)}
        confirmLabel="Reset account"
        danger
        busy={resetting}
        error={resetError}
        onConfirm={doReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: number;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 font-mono text-lg ${tone !== undefined ? pnlClass(tone) : ""}`}>
        {value}
      </div>
      {sub && <div className={`text-xs ${tone !== undefined ? pnlClass(tone) : "text-muted"}`}>{sub}</div>}
    </div>
  );
}

function Positions({
  positions,
  active,
  onPick,
}: {
  positions: AccountData["positions"];
  active?: string;
  onPick: (symbol: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 font-semibold">Positions</div>
      {positions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          No open positions. Use the trade panel to buy your first stock.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Avg cost</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-right">Unrealized</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onPick(p.symbol)}
                  className={`cursor-pointer border-b border-border/50 last:border-0 hover:bg-panel2 ${
                    p.symbol === active ? "bg-panel2" : ""
                  }`}
                  title={`Show ${p.symbol} chart`}
                >
                  <td className="px-4 py-2 font-mono font-medium">
                    {p.symbol === active && (
                      <span className="mr-1 text-brand">▸</span>
                    )}
                    {p.symbol}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{fmtNumber(p.quantity)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmtMoney(p.avgCost)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmtMoney(p.price)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmtMoney(p.marketValue)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${pnlClass(p.unrealizedPnl)}`}>
                    {fmtMoney(p.unrealizedPnl, { sign: true })}
                    <span className="ml-1 text-xs">
                      ({fmtPercent(p.unrealizedPnlPercent)})
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(p.symbol);
                      }}
                      className="text-xs text-brand hover:underline"
                    >
                      Trade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function History({ trades }: { trades: AccountData["trades"] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 font-semibold">Trade history</div>
      {trades.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No trades yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-panel text-left text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Side</th>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Realized</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-muted">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className={`px-4 py-2 font-medium ${t.side === "BUY" ? "text-up" : "text-down"}`}>
                    {t.side}
                  </td>
                  <td className="px-4 py-2 font-mono">{t.symbol}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmtNumber(t.quantity)}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmtMoney(t.price)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${pnlClass(t.realizedPnl)}`}>
                    {t.side === "SELL" ? fmtMoney(t.realizedPnl, { sign: true }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
