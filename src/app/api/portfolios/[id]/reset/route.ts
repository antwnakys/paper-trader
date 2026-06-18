import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_STARTING_BALANCE,
  MIN_STARTING_BALANCE,
} from "@/lib/constants";

type Params = { params: { id: string } };

// POST /api/portfolios/:id/reset — wipe all positions & trades and restore cash.
// Optionally accepts a new starting balance.
export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: params.id, userId },
  });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  let startingBalance = portfolio.startingBalance;
  if (body.startingBalance !== undefined && body.startingBalance !== null) {
    const next = Number(body.startingBalance);
    if (
      !Number.isFinite(next) ||
      next < MIN_STARTING_BALANCE ||
      next > MAX_STARTING_BALANCE
    ) {
      return NextResponse.json(
        {
          error: `Starting balance must be between $${MIN_STARTING_BALANCE} and $${MAX_STARTING_BALANCE.toLocaleString()}`,
        },
        { status: 400 }
      );
    }
    startingBalance = next;
  }

  await prisma.$transaction([
    prisma.position.deleteMany({ where: { portfolioId: portfolio.id } }),
    prisma.trade.deleteMany({ where: { portfolioId: portfolio.id } }),
    prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { startingBalance, cash: startingBalance },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
