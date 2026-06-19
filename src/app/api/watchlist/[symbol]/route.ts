import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/watchlist/:symbol — unfollow a symbol.
export async function DELETE(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  await prisma.watchlistItem.deleteMany({ where: { userId, symbol } });

  return NextResponse.json({ ok: true });
}
