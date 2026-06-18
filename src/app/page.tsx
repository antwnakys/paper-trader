import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/AuthButtons";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  const features = [
    ["20 accounts", "Run up to 20 independent paper trading accounts side by side."],
    ["Your starting balance", "Choose any starting balance and reset whenever you like."],
    ["Live US stocks", "Trade real tickers priced from a live market-data feed."],
    ["Full P&L tracking", "Positions, realized & unrealized P&L, and a trade history."],
  ];

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-up" /> Paper money only — zero risk
      </div>
      <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
        Practice trading stocks
        <span className="text-brand"> without the risk</span>
      </h1>
      <p className="mt-5 max-w-xl text-pretty text-muted">
        PaperTrader is a free simulated trading platform. Sign in with Google,
        spin up multiple accounts, set your own starting balance, and trade live
        US stocks — all with fake money.
      </p>

      <div className="mt-8">
        <GoogleSignInButton className="btn bg-white px-6 py-3 text-base text-gray-800 hover:bg-gray-100" />
      </div>

      <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([title, body]) => (
          <div key={title} className="card p-5 text-left">
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-sm text-muted">{body}</div>
          </div>
        ))}
      </div>

      <p className="mt-16 text-xs text-muted">
        Built with Next.js, Prisma, NextAuth & Tailwind. For educational use only —
        not investment advice.
      </p>
    </main>
  );
}
