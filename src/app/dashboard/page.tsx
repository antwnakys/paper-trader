import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";
import AccountsManager from "@/components/AccountsManager";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <>
      <Header user={session.user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your accounts</h1>
          <p className="text-sm text-muted">
            Create, fund, reset, or open any of your paper trading accounts.
          </p>
        </div>
        <AccountsManager />
      </main>
    </>
  );
}
