import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import AccountView from "@/components/AccountView";

export default async function AccountPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  // Confirm ownership before rendering the client view.
  const owned = await prisma.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });

  return (
    <>
      <Header user={session.user} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/dashboard" className="text-sm text-muted hover:text-text">
          ← All accounts
        </Link>
        {owned ? (
          <AccountView portfolioId={params.id} />
        ) : (
          <p className="mt-8 text-down">Account not found.</p>
        )}
      </main>
    </>
  );
}
