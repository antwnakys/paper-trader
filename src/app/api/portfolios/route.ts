import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market";
import {
  DEFAULT_STARTING_BALANCE,
  MAX_PORTFOLIOS_PER_USER,
  MAX_STARTING_BALANCE,
  MIN_STARTING_BALANCE,
} from "@/lib/constants";

// GET /api/portfolios — list the signed-in user's accounts with live equity,
// total return, and a compact equity history for the comparison sparklines.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      positions: true,
      equityPoints: { orderBy: { createdAt: "asc" } },
      _count: { select: { trades: true } },
    },
  });

  // Quote every distinct held symbol once.
  const symbols = [...new Set(portfolios.flatMap((p) => p.positions.map((x) => x.symbol)))];
  const priceEntries = await Promise.all(
    symbols.map(async (s) => [s, (await getQuote(s))?.price ?? null] as const)
  );
  const priceMap = new Map(priceEntries);

  const now = Date.now();
  const result = portfolios.map((p) => {
    const holdings = p.positions.reduce((sum, pos) => {
      const price = priceMap.get(pos.symbol) ?? pos.avgCost;
      return sum + price * pos.quantity;
    }, 0);
    const equity = p.cash + holdings;
    const totalReturn = equity - p.startingBalance;
    const totalReturnPercent =
      p.startingBalance > 0 ? (totalReturn / p.startingBalance) * 100 : 0;
    const equityHistory = [
      { t: p.createdAt.getTime(), equity: p.startingBalance },
      ...p.equityPoints.map((e) => ({ t: e.createdAt.getTime(), equity: e.equity })),
      { t: now, equity },
    ];
    return {
      id: p.id,
      name: p.name,
      startingBalance: p.startingBalance,
      cash: p.cash,
      positionsCount: p.positions.length,
      tradesCount: p._count.trades,
      equity,
      totalReturn,
      totalReturnPercent,
      equityHistory,
    };
  });

  return NextResponse.json({ portfolios: result, max: MAX_PORTFOLIOS_PER_USER });
}

// POST /api/portfolios — create a new account with a chosen starting balance.
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim() || "New Account";
  const startingBalance = Number(body.startingBalance ?? DEFAULT_STARTING_BALANCE);

  if (
    !Number.isFinite(startingBalance) ||
    startingBalance < MIN_STARTING_BALANCE ||
    startingBalance > MAX_STARTING_BALANCE
  ) {
    return NextResponse.json(
      {
        error: `Starting balance must be between $${MIN_STARTING_BALANCE} and $${MAX_STARTING_BALANCE.toLocaleString()}`,
      },
      { status: 400 }
    );
  }

  const count = await prisma.portfolio.count({ where: { userId } });
  if (count >= MAX_PORTFOLIOS_PER_USER) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_PORTFOLIOS_PER_USER} accounts` },
      { status: 400 }
    );
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      userId,
      name: name.slice(0, 60),
      startingBalance,
      cash: startingBalance,
    },
  });

  return NextResponse.json({ portfolio }, { status: 201 });
}
