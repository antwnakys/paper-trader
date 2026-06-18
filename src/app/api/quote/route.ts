import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getQuote } from "@/lib/market";

// GET /api/quote?symbol=AAPL — current quote for a symbol.
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = new URL(req.url).searchParams.get("symbol") ?? "";
  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: "No data" }, { status: 404 });

  return NextResponse.json({ quote });
}
