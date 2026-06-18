import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getSeries, isChartRange } from "@/lib/market";

// GET /api/chart?symbol=NVDA&range=1D — price series for a chart.
// range ∈ 1D | 1W | 1M | 3M | 1Y (defaults to 3M).
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") ?? "";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const rangeParam = url.searchParams.get("range") ?? "3M";
  const range = isChartRange(rangeParam) ? rangeParam : "3M";

  const series = await getSeries(symbol, range);
  return NextResponse.json({ symbol: symbol.toUpperCase(), range, series });
}
