import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market";

export type LeaderRow = {
  userId: string;
  name: string;
  image: string | null;
  accounts: number;
  equity: number;
  returnPercent: number;
};

/**
 * Rank every trader by overall return across all their accounts.
 *
 * Equity is each account's cash plus live-valued holdings; return is total
 * equity vs total starting balance. Only users with at least one account are
 * included. Capped at 100 rows.
 */
export async function computeLeaderboard(): Promise<LeaderRow[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      portfolios: {
        select: {
          startingBalance: true,
          cash: true,
          positions: { select: { symbol: true, quantity: true, avgCost: true } },
        },
      },
    },
  });

  // Quote every distinct held symbol once.
  const symbols = [
    ...new Set(
      users.flatMap((u) => u.portfolios.flatMap((p) => p.positions.map((x) => x.symbol)))
    ),
  ];
  const priceEntries = await Promise.all(
    symbols.map(async (s) => [s, (await getQuote(s))?.price ?? null] as const)
  );
  const priceMap = new Map(priceEntries);

  return users
    .filter((u) => u.portfolios.length > 0)
    .map((u) => {
      let startingTotal = 0;
      let equity = 0;
      for (const p of u.portfolios) {
        startingTotal += p.startingBalance;
        const holdings = p.positions.reduce(
          (sum, pos) => sum + (priceMap.get(pos.symbol) ?? pos.avgCost) * pos.quantity,
          0
        );
        equity += p.cash + holdings;
      }
      const returnPercent =
        startingTotal > 0 ? ((equity - startingTotal) / startingTotal) * 100 : 0;
      return {
        userId: u.id,
        name: u.name ?? "Anonymous trader",
        image: u.image,
        accounts: u.portfolios.length,
        equity,
        returnPercent,
      };
    })
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, 100);
}
