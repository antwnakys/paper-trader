import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeOrder, TradeError } from "@/lib/trading";

type Params = { params: { id: string } };

// POST /api/portfolios/:id/orders — place a market or limit BUY/SELL order.
export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const side = String(body.side ?? "").toUpperCase();
  const type = String(body.type ?? "MARKET").toUpperCase();

  if (side !== "BUY" && side !== "SELL") {
    return NextResponse.json({ error: "side must be BUY or SELL" }, { status: 400 });
  }

  // Order size: dollar `amount` takes precedence, otherwise share `quantity`.
  const size: { amount?: number; quantity?: number } = {};
  if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
    size.amount = Number(body.amount);
  } else {
    size.quantity = Number(body.quantity);
  }

  // Limit order: validate and rest it instead of executing immediately.
  if (type === "LIMIT") {
    const limitPrice = Number(body.limitPrice);
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      return NextResponse.json({ error: "Enter a valid limit price" }, { status: 400 });
    }
    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }
    const qty = size.amount != null ? null : size.quantity ?? 0;
    const amt = size.amount ?? null;
    if ((amt == null && (!qty || qty <= 0)) || (amt != null && amt <= 0)) {
      return NextResponse.json({ error: "Enter a valid order size" }, { status: 400 });
    }

    // Ownership check.
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });
    if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const order = await prisma.pendingOrder.create({
      data: {
        portfolioId: portfolio.id,
        symbol,
        side,
        quantity: amt != null ? null : qty,
        amount: amt,
        limitPrice,
      },
    });
    return NextResponse.json({ pendingOrder: order }, { status: 201 });
  }

  try {
    const result = await executeOrder({
      userId,
      portfolioId: params.id,
      symbol,
      side,
      ...size,
    });
    return NextResponse.json({ trade: result }, { status: 201 });
  } catch (err) {
    if (err instanceof TradeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order failed", err);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}
