import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { getCompanyNews, getCompanyProfile } from "@/lib/market";

// GET /api/company?symbol=AAPL — profile + recent news for a stock.
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = new URL(req.url).searchParams.get("symbol") ?? "";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const [profile, news] = await Promise.all([
    getCompanyProfile(symbol),
    getCompanyNews(symbol),
  ]);

  return NextResponse.json({ profile, news });
}
