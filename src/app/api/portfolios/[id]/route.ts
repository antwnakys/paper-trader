import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market";

type Params = { params: { id: string } };

// GET /api/portfolios/:id — full account view with live-valued positions.
export async function GET(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: params.id, userId },
    include: {
      positions: { orderBy: { symbol: "asc" } },
      trades: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Value every open position from the live (or simulated) feed.
  const quotes = await Promise.all(
    portfolio.positions.map((p) => getQuote(p.symbol))
  );

  let holdingsValue = 0;
  const positions = portfolio.positions.map((p, i) => {
    const quote = quotes[i];
    const price = quote?.price ?? p.avgCost;
    const marketValue = price * p.quantity;
    const costBasis = p.avgCost * p.quantity;
    holdingsValue += marketValue;
    return {
      id: p.id,
      symbol: p.symbol,
      quantity: p.quantity,
      avgCost: p.avgCost,
      price,
      marketValue,
      unrealizedPnl: marketValue - costBasis,
      unrealizedPnlPercent: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
      changePercent: quote?.changePercent ?? 0,
      simulated: quote?.simulated ?? true,
    };
  });

  const equity = portfolio.cash + holdingsValue;
  const realizedPnl = portfolio.trades.reduce((s, t) => s + t.realizedPnl, 0);

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      startingBalance: portfolio.startingBalance,
      cash: portfolio.cash,
      createdAt: portfolio.createdAt,
    },
    positions,
    trades: portfolio.trades,
    summary: {
      cash: portfolio.cash,
      holdingsValue,
      equity,
      totalReturn: equity - portfolio.startingBalance,
      totalReturnPercent:
        portfolio.startingBalance > 0
          ? ((equity - portfolio.startingBalance) / portfolio.startingBalance) * 100
          : 0,
      realizedPnl,
    },
  });
}

// DELETE /api/portfolios/:id — permanently delete an account.
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.portfolio.delete({ where: { id: portfolio.id } });
  return NextResponse.json({ ok: true });
}
