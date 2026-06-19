import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market";

// GET /api/watchlist — the user's followed symbols with live quotes.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const quotes = await Promise.all(items.map((i) => getQuote(i.symbol)));
  const watchlist = items.map((i, idx) => ({
    symbol: i.symbol,
    price: quotes[idx]?.price ?? null,
    changePercent: quotes[idx]?.changePercent ?? null,
  }));

  return NextResponse.json({ watchlist });
}

// POST /api/watchlist { symbol } — follow a symbol.
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // Validate the symbol exists before saving it.
  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: `No market data for "${symbol}"` }, { status: 404 });

  await prisma.watchlistItem.upsert({
    where: { userId_symbol: { userId, symbol } },
    create: { userId, symbol },
    update: {},
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
