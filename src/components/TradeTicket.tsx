"use client";

import { useEffect, useRef, useState } from "react";

import { fetcher, postJson } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  simulated: boolean;
};

type Match = { symbol: string; description: string };

export default function TradeTicket({
  portfolioId,
  cash,
  presetSymbol,
  onDone,
}: {
  portfolioId: string;
  cash: number;
  presetSymbol?: string;
  onDone: () => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [qty, setQty] = useState("1");
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState<"shares" | "dollars">("shares");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Allow parent (e.g. a position row) to preload a symbol into the ticket.
  useEffect(() => {
    if (presetSymbol) selectSymbol(presetSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSymbol]);

  // Debounced symbol search.
  useEffect(() => {
    if (!query || query === symbol) {
      setMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await fetcher(`/api/search?q=${encodeURIComponent(query)}`);
        setMatches(data.results ?? []);
        setShowMatches(true);
      } catch {
        setMatches([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, symbol]);

  async function loadQuote(sym: string) {
    setLoadingQuote(true);
    try {
      const data = await fetcher(`/api/quote?symbol=${encodeURIComponent(sym)}`);
      setQuote(data.quote);
    } catch {
      setQuote(null);
      setMsg({ kind: "err", text: `No market data for ${sym}` });
    } finally {
      setLoadingQuote(false);
    }
  }

  // Refresh the quote periodically while a symbol is selected.
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;
  useEffect(() => {
    if (!symbol) return;
    const id = setInterval(() => loadQuote(symbolRef.current), 10000);
    return () => clearInterval(id);
  }, [symbol]);

  function selectSymbol(sym: string) {
    const s = sym.toUpperCase();
    setSymbol(s);
    setQuery(s);
    setShowMatches(false);
    setMsg(null);
    loadQuote(s);
  }

  const price = quote?.price ?? 0;
  const quantity = Number(qty);
  const amountNum = Number(amount);
  // Estimated cost/proceeds and implied share count, per input mode.
  const estimate =
    mode === "dollars"
      ? Number.isFinite(amountNum)
        ? amountNum
        : 0
      : quote && Number.isFinite(quantity)
      ? price * quantity
      : 0;
  const estShares =
    mode === "dollars"
      ? price > 0 && Number.isFinite(amountNum)
        ? amountNum / price
        : 0
      : Number.isFinite(quantity)
      ? quantity
      : 0;
  const canAfford = side === "SELL" || estimate <= cash;

  async function submit() {
    const valid =
      mode === "dollars"
        ? Number.isFinite(amountNum) && amountNum > 0
        : Number.isFinite(quantity) && quantity > 0;
    if (!symbol || !valid) {
      setMsg({
        kind: "err",
        text:
          mode === "dollars"
            ? "Enter a symbol and a positive dollar amount."
            : "Enter a symbol and a positive quantity.",
      });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const data = await postJson(`/api/portfolios/${portfolioId}/orders`, {
        symbol,
        side,
        ...(mode === "dollars" ? { amount: amountNum } : { quantity }),
      });
      const t = data.trade;
      setMsg({
        kind: "ok",
        text: `${t.side} ${t.quantity} ${t.symbol} @ ${fmtMoney(t.price)}`,
      });
      onDone();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">Trade</h2>

      {/* Symbol search */}
      <div className="relative">
        <label className="label">Symbol</label>
        <input
          className="input uppercase"
          placeholder="Search ticker or company…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setShowMatches(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectSymbol(query);
            }
          }}
        />
        {showMatches && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-panel2 shadow-xl">
            {matches.map((m) => (
              <li key={m.symbol}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-border"
                  onClick={() => selectSymbol(m.symbol)}
                >
                  <span className="font-mono font-medium">{m.symbol}</span>
                  <span className="ml-2 truncate text-xs text-muted">
                    {m.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quote */}
      {symbol && (
        <div className="mt-3 flex items-baseline justify-between rounded-lg bg-panel2 px-3 py-2">
          <span className="font-mono font-semibold">{symbol}</span>
          {loadingQuote && !quote ? (
            <span className="text-sm text-muted">Loading…</span>
          ) : quote ? (
            <span className="text-right">
              <span className="font-mono text-lg">{fmtMoney(quote.price)}</span>{" "}
              <span className={`text-sm ${pnlClass(quote.change)}`}>
                {fmtPercent(quote.changePercent)}
              </span>
            </span>
          ) : (
            <span className="text-sm text-down">No data</span>
          )}
        </div>
      )}
      {quote?.simulated && (
        <p className="mt-1 text-xs text-muted">
          Simulated price (set FINNHUB_API_KEY for live data).
        </p>
      )}

      {/* Side toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className={side === "BUY" ? "btn-up" : "btn-ghost"}
          onClick={() => setSide("BUY")}
        >
          Buy
        </button>
        <button
          className={side === "SELL" ? "btn-down" : "btn-ghost"}
          onClick={() => setSide("SELL")}
        >
          Sell
        </button>
      </div>

      {/* Order size: shares or dollars */}
      <div className="mt-4">
        <div className="mb-2 inline-flex rounded-lg border border-border bg-panel2 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("shares")}
            className={`rounded-md px-3 py-1 ${mode === "shares" ? "bg-border text-text" : "text-muted"}`}
          >
            Shares
          </button>
          <button
            type="button"
            onClick={() => setMode("dollars")}
            className={`rounded-md px-3 py-1 ${mode === "dollars" ? "bg-border text-text" : "text-muted"}`}
          >
            Dollars
          </button>
        </div>

        {mode === "shares" ? (
          <>
            <label className="label">Quantity (shares)</label>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="label">Amount to invest (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                $
              </span>
              <input
                className="input pl-6"
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {[100, 500, 1000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="rounded-md border border-border bg-panel2 px-2 py-1 text-xs text-muted hover:text-text"
                >
                  ${v}
                </button>
              ))}
              {side === "BUY" && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(cash * 100) / 100))}
                  className="rounded-md border border-border bg-panel2 px-2 py-1 text-xs text-muted hover:text-text"
                >
                  Max
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Estimate */}
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-muted">Estimated {side === "BUY" ? "cost" : "proceeds"}</span>
        <span className="font-mono">{fmtMoney(estimate)}</span>
      </div>
      {quote && (
        <div className="flex justify-between text-sm">
          <span className="text-muted">Estimated shares</span>
          <span className="font-mono">
            {estShares > 0 ? estShares.toFixed(4) : "—"}
          </span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted">Buying power</span>
        <span className="font-mono">{fmtMoney(cash)}</span>
      </div>

      <button
        className={`mt-4 w-full ${side === "BUY" ? "btn-up" : "btn-down"}`}
        disabled={submitting || !symbol || !quote || (side === "BUY" && !canAfford)}
        onClick={submit}
      >
        {submitting
          ? "Placing…"
          : side === "BUY" && !canAfford
          ? "Insufficient cash"
          : `${side} ${symbol || ""}`}
      </button>

      {msg && (
        <p className={`mt-3 text-sm ${msg.kind === "ok" ? "text-up" : "text-down"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
