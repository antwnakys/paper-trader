import Link from "next/link";

import { SignOutButton } from "@/components/AuthButtons";

export default function Header({
  user,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white">
              ▲
            </span>
            PaperTrader
          </Link>
          {user && (
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/dashboard" className="hover:text-text">
                Accounts
              </Link>
            </nav>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm">{user.name ?? "Trader"}</div>
              <div className="text-xs text-muted">{user.email}</div>
            </div>
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 rounded-full border border-border"
              />
            )}
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  );
}
