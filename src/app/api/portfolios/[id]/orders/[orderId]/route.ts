import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string; orderId: string } };

// DELETE /api/portfolios/:id/orders/:orderId — cancel a resting limit order.
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.pendingOrder.findFirst({
    where: {
      id: params.orderId,
      portfolioId: params.id,
      status: "OPEN",
      portfolio: { userId },
    },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pendingOrder.update({
    where: { id: order.id },
    data: { status: "CANCELED" },
  });
  return NextResponse.json({ ok: true });
}
