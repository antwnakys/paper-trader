import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_STARTING_BALANCE,
  MAX_PORTFOLIOS_PER_USER,
  MAX_STARTING_BALANCE,
  MIN_STARTING_BALANCE,
} from "@/lib/constants";

// GET /api/portfolios — list the signed-in user's paper trading accounts.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      positions: true,
      _count: { select: { trades: true } },
    },
  });

  return NextResponse.json({ portfolios, max: MAX_PORTFOLIOS_PER_USER });
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
