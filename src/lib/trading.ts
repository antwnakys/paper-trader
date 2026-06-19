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
 * The order size can be expressed either as a share `quantity` or as a dollar
 * `amount` (notional) — exactly one must be provided. Dollar orders are
 * converted to a (possibly fractional) share count at the execution price.
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
  quantity?: number;
  amount?: number;
}): Promise<ExecutedTrade> {
  const symbol = params.symbol.trim().toUpperCase();
  if (!symbol) throw new TradeError("Symbol is required");

  const hasQty = params.quantity !== undefined && params.quantity !== null;
  const hasAmount = params.amount !== undefined && params.amount !== null;
  if (hasQty === hasAmount) {
    throw new TradeError("Provide either a share quantity or a dollar amount");
  }

  // Price the order from the live (or simulated) feed.
  const quote = await getQuote(symbol);
  if (!quote) {
    throw new TradeError(`No market data for "${symbol}"`, 404);
  }
  const price = quote.price;
  if (!(price > 0)) {
    throw new TradeError(`Invalid market price for "${symbol}"`);
  }

  // Resolve the order into a share quantity.
  let quantity: number;
  if (hasAmount) {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new TradeError("Dollar amount must be a positive number");
    }
    quantity = amount / price;
  } else {
    quantity = Number(params.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new TradeError("Quantity must be a positive number");
    }
  }

  // Floor to 6 decimals so a dollar-based buy never rounds up past the
  // requested amount (and to keep fractional shares tidy).
  quantity = Math.floor(quantity * 1e6) / 1e6;
  if (quantity <= 0) {
    throw new TradeError("Order amount is too small to buy any shares");
  }

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

/**
 * Fill any resting limit orders whose trigger has been crossed.
 *
 * Called lazily when an account is viewed (there is no background worker). A BUY
 * fills when the market price is at/below its limit; a SELL when at/above. Orders
 * that can't fill yet (e.g. insufficient cash) are left open. Returns the symbols
 * that filled, for surfacing to the user.
 */
export async function processPendingFills(
  userId: string,
  portfolioId: string
): Promise<string[]> {
  const open = await prisma.pendingOrder.findMany({
    where: { portfolioId, status: "OPEN", portfolio: { userId } },
    orderBy: { createdAt: "asc" },
  });
  if (open.length === 0) return [];

  const filled: string[] = [];
  for (const o of open) {
    const quote = await getQuote(o.symbol);
    if (!quote) continue;
    const crossed =
      o.side === "BUY" ? quote.price <= o.limitPrice : quote.price >= o.limitPrice;
    if (!crossed) continue;

    try {
      const res = await executeOrder({
        userId,
        portfolioId,
        symbol: o.symbol,
        side: o.side,
        ...(o.amount != null ? { amount: o.amount } : { quantity: o.quantity ?? 0 }),
      });
      await prisma.pendingOrder.update({
        where: { id: o.id },
        data: { status: "FILLED", filledAt: new Date(), filledPrice: res.price },
      });
      filled.push(o.symbol);
    } catch {
      // Can't fill right now (e.g. insufficient cash/shares) — leave it open.
    }
  }
  return filled;
}
