import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getQuote } from "@/lib/market";

// A curated set of widely-traded US tickers for the dashboard overview.
const POPULAR = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "AMD",
  "NFLX",
  "JPM",
  "SPY",
  "QQQ",
];

// GET /api/market/movers — live quotes for popular stocks, sorted by day move.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await Promise.all(POPULAR.map((s) => getQuote(s)));
  const movers = quotes
    .filter((q): q is NonNullable<typeof q> => q != null)
    .map((q) => ({
      symbol: q.symbol,
      price: q.price,
      changePercent: q.changePercent,
    }))
    .sort((a, b) => b.changePercent - a.changePercent);

  return NextResponse.json({ movers });
}
