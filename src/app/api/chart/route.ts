import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getDailySeries } from "@/lib/market";

// GET /api/chart?symbol=NVDA&days=90 — daily close series for a chart.
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") ?? "";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const days = Math.min(365, Math.max(7, Number(url.searchParams.get("days") ?? 90)));
  const series = await getDailySeries(symbol, days);

  return NextResponse.json({ symbol: symbol.toUpperCase(), series });
}
