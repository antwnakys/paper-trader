"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";

type Profile = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  exchange: string;
  weburl: string;
};
type News = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
};

function timeAgo(unixSec: number): string {
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export default function CompanyInfo({ symbol }: { symbol?: string }) {
  const { data } = useSWR<{ profile: Profile | null; news: News[] }>(
    symbol ? `/api/company?symbol=${encodeURIComponent(symbol)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!symbol) return null;

  const profile = data?.profile;
  const news = data?.news ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        {profile?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logo}
            alt=""
            className="h-9 w-9 rounded-md bg-white object-contain p-0.5"
          />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-md bg-panel2 font-mono text-xs">
            {symbol.slice(0, 4)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold">{profile?.name ?? symbol}</div>
          <div className="text-xs text-muted">
            {[profile?.exchange, profile?.industry].filter((s) => s && s !== "—").join(" · ") ||
              "Company profile"}
          </div>
        </div>
        {profile?.weburl && (
          <a
            href={profile.weburl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-brand hover:underline"
          >
            Website ↗
          </a>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Latest news
        </div>
        {news.length === 0 ? (
          <p className="text-sm text-muted">No recent headlines.</p>
        ) : (
          <ul className="space-y-2">
            {news.map((n) => (
              <li key={n.id}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md p-2 hover:bg-panel2"
                >
                  <div className="line-clamp-2 text-sm">{n.headline}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {n.source} · {timeAgo(n.datetime)}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
