import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { executeOrder, TradeError } from "@/lib/trading";

type Params = { params: { id: string } };

// POST /api/portfolios/:id/orders — place a market BUY or SELL order.
export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "");
  const side = String(body.side ?? "").toUpperCase();
  const quantity = Number(body.quantity);

  if (side !== "BUY" && side !== "SELL") {
    return NextResponse.json({ error: "side must be BUY or SELL" }, { status: 400 });
  }

  try {
    const result = await executeOrder({
      userId,
      portfolioId: params.id,
      symbol,
      side,
      quantity,
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
