import { Prisma, type TradeSide } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market";

export class TradeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ExecutedTrade = {
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  realizedPnl: number;
  cash: number;
};

/**
 * Execute a market order against a portfolio.
 *
 * Buys deduct cash and increase the position (recomputing weighted avg cost).
 * Sells require sufficient shares, credit cash, book realized P&L, and remove
 * the position row when fully closed. Everything runs in one transaction.
 */
export async function executeOrder(params: {
  userId: string;
  portfolioId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
}): Promise<ExecutedTrade> {
  const symbol = params.symbol.trim().toUpperCase();
  const quantity = params.quantity;

  if (!symbol) throw new TradeError("Symbol is required");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new TradeError("Quantity must be a positive number");
  }

  // Price the order from the live (or simulated) feed.
  const quote = await getQuote(symbol);
  if (!quote) {
    throw new TradeError(`No market data for "${symbol}"`, 404);
  }
  const price = quote.price;

  return prisma.$transaction(async (tx) => {
    // Ownership check inside the transaction.
    const portfolio = await tx.portfolio.findFirst({
      where: { id: params.portfolioId, userId: params.userId },
    });
    if (!portfolio) throw new TradeError("Portfolio not found", 404);

    const existing = await tx.position.findUnique({
      where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } },
    });

    let realizedPnl = 0;
    let newCash = portfolio.cash;

    if (params.side === "BUY") {
      const cost = price * quantity;
      if (cost > portfolio.cash + 1e-6) {
        throw new TradeError(
          `Insufficient cash: need $${cost.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`
        );
      }
      newCash = portfolio.cash - cost;

      if (existing) {
        const totalQty = existing.quantity + quantity;
        const avgCost =
          (existing.avgCost * existing.quantity + price * quantity) / totalQty;
        await tx.position.update({
          where: { id: existing.id },
          data: { quantity: totalQty, avgCost },
        });
      } else {
        await tx.position.create({
          data: { portfolioId: portfolio.id, symbol, quantity, avgCost: price },
        });
      }
    } else {
      // SELL
      if (!existing || existing.quantity < quantity - 1e-6) {
        throw new TradeError(
          `Not enough shares: have ${existing?.quantity ?? 0}, tried to sell ${quantity}`
        );
      }
      const proceeds = price * quantity;
      realizedPnl = (price - existing.avgCost) * quantity;
      newCash = portfolio.cash + proceeds;

      const remaining = existing.quantity - quantity;
      if (remaining <= 1e-6) {
        await tx.position.delete({ where: { id: existing.id } });
      } else {
        await tx.position.update({
          where: { id: existing.id },
          data: { quantity: remaining },
        });
      }
    }

    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { cash: newCash },
    });

    await tx.trade.create({
      data: {
        portfolioId: portfolio.id,
        symbol,
        side: params.side,
        quantity,
        price,
        realizedPnl,
      },
    });

    return {
      symbol,
      side: params.side,
      quantity,
      price,
      realizedPnl: +realizedPnl.toFixed(2),
      cash: +newCash.toFixed(2),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
