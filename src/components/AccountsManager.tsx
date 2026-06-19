"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { fetcher, postJson, del } from "@/lib/fetcher";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/format";
import { DEFAULT_STARTING_BALANCE } from "@/lib/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import Sparkline from "@/components/Sparkline";

type Portfolio = {
  id: string;
  name: string;
  startingBalance: number;
  cash: number;
  positionsCount: number;
  tradesCount: number;
  equity: number;
  totalReturn: number;
  totalReturnPercent: number;
  equityHistory: { t: number; equity: number }[];
};

export default function AccountsManager() {
  const { data, error, isLoading, mutate } = useSWR<{
    portfolios: Portfolio[];
    max: number;
  }>("/api/portfolios", fetcher);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState(String(DEFAULT_STARTING_BALANCE));
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Account pending deletion (drives the in-app confirm dialog).
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const portfolios = data?.portfolios ?? [];
  const max = data?.max ?? 20;
  const atLimit = portfolios.length >= max;
  // Rank accounts by total return for the comparison view.
  const ranked = [...portfolios].sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);
  const showRank = ranked.length > 1;

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      await postJson("/api/portfolios", {
        name: name.trim() || undefined,
        startingBalance: Number(balance),
      });
      setName("");
      setBalance(String(DEFAULT_STARTING_BALANCE));
      mutate();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await del(`/api/portfolios/${pendingDelete.id}`);
      setPendingDelete(null);
      mutate();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Create */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Create an account</h2>
          <span className="text-xs text-muted">
            {portfolios.length} / {max} used
          </span>
        </div>
        <form onSubmit={createAccount} className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <div>
            <label className="label">Account name</label>
            <input
              className="input"
              placeholder="e.g. Growth Bets"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Starting balance ($)</label>
            <input
              className="input"
              type="number"
              min={100}
              step={100}
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              className="btn-brand w-full sm:w-auto"
              disabled={creating || atLimit}
              type="submit"
            >
              {atLimit ? "Limit reached" : creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
        {formError && <p className="mt-2 text-sm text-down">{formError}</p>}
      </section>

      {/* List */}
      <section>
        {isLoading && <p className="text-muted">Loading accounts…</p>}
        {error && <p className="text-down">Failed to load accounts.</p>}
        {!isLoading && portfolios.length === 0 && (
          <p className="text-muted">No accounts yet — create your first one above.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((p, i) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {showRank && (
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-panel2 text-[11px] text-muted"
                      title={`Rank #${i + 1} by return`}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="font-semibold">{p.name}</span>
                </div>
                <button
                  onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                  className="text-xs text-muted hover:text-down"
                  title="Delete account"
                >
                  Delete
                </button>
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <div className="font-mono text-xl font-semibold">{fmtMoney(p.equity)}</div>
                  <div className={`text-sm ${pnlClass(p.totalReturn)}`}>
                    {fmtMoney(p.totalReturn, { sign: true })} ({fmtPercent(p.totalReturnPercent)})
                  </div>
                </div>
                <div className="w-24">
                  <Sparkline data={p.equityHistory} baseline={p.startingBalance} />
                </div>
              </div>

              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Cash</dt>
                  <dd className="font-mono">{fmtMoney(p.cash)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Started with</dt>
                  <dd className="font-mono">{fmtMoney(p.startingBalance)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Positions · Trades</dt>
                  <dd className="font-mono">
                    {p.positionsCount} · {p.tradesCount}
                  </dd>
                </div>
              </dl>
              <Link href={`/account/${p.id}`} className="btn-brand mt-5">
                Open & trade
              </Link>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        message="This permanently removes the account along with its positions and trade history. This can't be undone."
        confirmLabel="Delete account"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
