# 📈 PaperTrader

A full-stack **paper trading** platform. Sign in with Google, create up to **20
independent accounts**, pick a starting balance for each, trade **live US
stocks**, and track your P&L — all with simulated money.

Built as a portfolio piece with **Next.js 14 (App Router)**, **TypeScript**,
**Prisma**, **NextAuth**, and **Tailwind CSS**, deployed on **Vercel + Supabase**.

### 🔗 [Live demo → paper-trader-gamma.vercel.app](https://paper-trader-gamma.vercel.app)

[![Live Demo](https://img.shields.io/badge/Live_Demo-paper--trader-3b82f6?logo=vercel&logoColor=white)](https://paper-trader-gamma.vercel.app) ![Tech](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- 🔐 **Google sign-in** (OAuth via NextAuth, database sessions)
- 🗂️ **Up to 20 accounts** per user, each fully independent
- 💵 **Custom starting balance** per account, set on creation or reset
- ♻️ **Full reset** — wipe positions & history and restore (or change) cash
- 📊 **Live US stock prices** via Finnhub, with a built-in **simulated price
  engine fallback** so it works with zero API keys
- 🛒 **Market buy/sell** with symbol search, live quotes, and cash checks
- 📈 **Portfolio analytics** — equity, cash, unrealized & realized P&L, total
  return %, weighted-average cost basis, and a full trade ledger
- 🔁 Auto-refreshing positions and quotes

---

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | Next.js 14 (App Router, Server Components, Route Handlers) |
| Language  | TypeScript                                         |
| Auth      | NextAuth.js (Google provider, Prisma adapter)      |
| Database  | PostgreSQL (Supabase) via Prisma ORM               |
| Styling   | Tailwind CSS                                        |
| Data      | SWR (client), Finnhub (market data)                |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in `.env`:

- **`DATABASE_URL` / `DIRECT_URL`** — a PostgreSQL database. The fastest path is
  a free [Supabase](https://supabase.com) project: *Project Settings → Database →
  Connection string*. Use the pooled (port 6543) URI for `DATABASE_URL` and the
  direct (port 5432) URI for `DIRECT_URL`. (Any local Postgres works too.)
- **`NEXTAUTH_SECRET`** — generate with `openssl rand -base64 32`.
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — see below.
- **`FINNHUB_API_KEY`** — *optional*. Free key at
  [finnhub.io](https://finnhub.io). Leave blank to use the simulated price
  engine.

### 3. Google OAuth setup

1. Go to the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create credentials → OAuth client ID → Web application**.
3. Add an **Authorized redirect URI**:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_DOMAIN/api/auth/callback/google`
4. Copy the client ID & secret into `.env`.

### 4. Create the database schema

```bash
npm run db:push
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Deploying to Vercel + Supabase

1. Create a **Supabase** project and grab the connection strings (set
   `DATABASE_URL` to the pooled URI, `DIRECT_URL` to the direct URI).
2. Run `npm run db:push` locally against the Supabase database (or use
   `prisma migrate deploy` in CI).
3. Import the repo into **Vercel** and add all the env vars from `.env`.
4. Set `NEXTAUTH_URL` to your production URL and add the production redirect URI
   in Google Cloud.
5. Deploy. `npm run build` runs `prisma generate` automatically.

---

## Project structure

```
prisma/schema.prisma         Database schema (NextAuth + trading domain)
src/lib/
  auth.ts                    NextAuth config + session helpers
  prisma.ts                  Prisma client singleton
  market.ts                  Finnhub client + simulated fallback
  trading.ts                 Transactional order-execution engine
  constants.ts               Business rules (20-account limit, balances)
src/app/api/
  auth/[...nextauth]         NextAuth route handler
  portfolios/                List/create accounts
  portfolios/[id]/           Account detail, delete
  portfolios/[id]/reset/     Reset an account
  portfolios/[id]/orders/    Place buy/sell orders
  quote/  search/            Market data endpoints
src/app/
  page.tsx                   Landing / sign-in
  dashboard/                 Account manager
  account/[id]/              Trading screen
src/components/              UI (Header, AccountsManager, AccountView, TradeTicket, …)
```

---

## How it works

- Each user can own up to **20 `Portfolio` rows** (the "accounts"). The limit and
  starting-balance guardrails live in `src/lib/constants.ts`.
- **Orders** run through `executeOrder()` in a single serializable Prisma
  transaction: buys check buying power and recompute weighted-average cost;
  sells check share count, credit cash, and book realized P&L. Every fill writes
  an immutable `Trade` row.
- **Reset** deletes all positions & trades for an account and restores cash to
  the (optionally new) starting balance.
- All API routes are scoped to the authenticated user, so accounts are private.

> ⚠️ For educational use only. Prices may be delayed or simulated. Not
> investment advice.

## License

MIT
