import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { searchSymbols } from "@/lib/market";

// GET /api/search?q=apple — symbol lookup for the trade ticket.
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchSymbols(q);
  return NextResponse.json({ results });
}
