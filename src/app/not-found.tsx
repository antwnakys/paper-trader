import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4 text-center">
      <div>
        <div className="font-mono text-5xl font-bold text-brand">404</div>
        <h1 className="mt-3 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That page doesn’t exist or has moved.
        </p>
        <Link href="/dashboard" className="btn-brand mt-5">
          Back to your accounts
        </Link>
      </div>
    </main>
  );
}
