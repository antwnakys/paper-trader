import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/leaderboard";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const rows = await computeLeaderboard();

  return (
    <>
      <Header user={session.user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted">
            Every trader ranked by total return across all their accounts.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted">No traders yet — be the first to make a trade!</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Trader</th>
                  <th className="px-4 py-3 text-right">Accounts</th>
                  <th className="px-4 py-3 text-right">Equity</th>
                  <th className="px-4 py-3 text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isYou = r.userId === session.user.id;
                  return (
                    <tr
                      key={r.userId}
                      className={`border-b border-border/50 last:border-0 ${
                        isYou ? "bg-panel2" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-muted">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r.image ? (
                            <img
                              src={r.image}
                              alt=""
                              className="h-6 w-6 rounded-full border border-border"
                            />
                          ) : (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-panel2 text-xs">
                              {r.name.slice(0, 1)}
                            </span>
                          )}
                          <span className="font-medium">{r.name}</span>
                          {isYou && (
                            <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                              YOU
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{r.accounts}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.equity)}</td>
                      <td className={`px-4 py-3 text-right font-mono ${pnlClass(r.returnPercent)}`}>
                        {fmtPercent(r.returnPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
