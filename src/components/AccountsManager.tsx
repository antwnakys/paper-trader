"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { fetcher, postJson, del } from "@/lib/fetcher";
import { fmtMoney } from "@/lib/format";
import { DEFAULT_STARTING_BALANCE } from "@/lib/constants";

type Portfolio = {
  id: string;
  name: string;
  startingBalance: number;
  cash: number;
  positions: { id: string }[];
  _count: { trades: number };
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

  const portfolios = data?.portfolios ?? [];
  const max = data?.max ?? 20;
  const atLimit = portfolios.length >= max;

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

  async function deleteAccount(id: string, label: string) {
    if (!confirm(`Delete "${label}"? This permanently removes its positions and history.`)) {
      return;
    }
    await del(`/api/portfolios/${id}`);
    mutate();
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
          {portfolios.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="font-semibold">{p.name}</div>
                <button
                  onClick={() => deleteAccount(p.id, p.name)}
                  className="text-xs text-muted hover:text-down"
                  title="Delete account"
                >
                  Delete
                </button>
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
                  <dt className="text-muted">Open positions</dt>
                  <dd className="font-mono">{p.positions.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Trades</dt>
                  <dd className="font-mono">{p._count.trades}</dd>
                </div>
              </dl>
              <Link href={`/account/${p.id}`} className="btn-brand mt-5">
                Open & trade
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
