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
