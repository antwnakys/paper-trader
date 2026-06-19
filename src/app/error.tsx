"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4 text-center">
      <div>
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-3 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error occurred. You can try again.
        </p>
        <button onClick={reset} className="btn-brand mt-5">
          Try again
        </button>
      </div>
    </main>
  );
}
