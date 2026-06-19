"use client";

import { del } from "@/lib/fetcher";
import { fmtMoney, fmtNumber } from "@/lib/format";

type PendingOrder = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number | null;
  amount: number | null;
  limitPrice: number;
};

export default function OrdersPanel({
  portfolioId,
  orders,
  onChange,
}: {
  portfolioId: string;
  orders: PendingOrder[];
  onChange: () => void;
}) {
  if (orders.length === 0) return null;

  async function cancel(orderId: string) {
    await del(`/api/portfolios/${portfolioId}/orders/${orderId}`);
    onChange();
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3 font-semibold">
        Open limit orders
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-2">Side</th>
            <th className="px-4 py-2">Symbol</th>
            <th className="px-4 py-2 text-right">Size</th>
            <th className="px-4 py-2 text-right">Limit</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-border/50 last:border-0">
              <td className={`px-4 py-2 font-medium ${o.side === "BUY" ? "text-up" : "text-down"}`}>
                {o.side}
              </td>
              <td className="px-4 py-2 font-mono">{o.symbol}</td>
              <td className="px-4 py-2 text-right font-mono">
                {o.amount != null ? fmtMoney(o.amount) : `${fmtNumber(o.quantity ?? 0)} sh`}
              </td>
              <td className="px-4 py-2 text-right font-mono">{fmtMoney(o.limitPrice)}</td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => cancel(o.id)}
                  className="text-xs text-muted hover:text-down"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
