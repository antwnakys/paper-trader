// Market-data access layer.
//
// Uses Finnhub when FINNHUB_API_KEY is set, otherwise falls back to a
// deterministic simulated price engine so the app is fully functional for
// local demos without any external dependency.

export type Quote = {
  symbol: string;
  price: number;
  // Previous close, used to compute the day change.
  prevClose: number;
  change: number;
  changePercent: number;
  // True when the value came from the simulated engine rather than a feed.
  simulated: boolean;
};

export type SymbolMatch = {
  symbol: string;
  description: string;
};

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function hasFinnhub(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

// ---------------------------------------------------------------------------
// Simulated engine
// ---------------------------------------------------------------------------

// Deterministic hash so a given symbol always maps to the same base price.
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function simulatedQuote(symbol: string): Quote {
  const sym = symbol.toUpperCase();
  const seed = hashString(sym);
  // Base price in a believable range, stable per symbol.
  const base = 20 + (seed % 480) + ((seed >> 9) % 100) / 100;

  // Slow intraday drift that changes over time but stays smooth.
  const minutes = Math.floor(Date.now() / 60000);
  const wave =
    Math.sin((minutes + (seed % 60)) / 30) * 0.5 +
    Math.sin((minutes + (seed % 17)) / 7) * 0.5;
  const price = +(base * (1 + wave * 0.02)).toFixed(2);

  const prevClose = +base.toFixed(2);
  const change = +(price - prevClose).toFixed(2);
  const changePercent = +((change / prevClose) * 100).toFixed(2);

  return { symbol: sym, price, prevClose, change, changePercent, simulated: true };
}

const SIM_UNIVERSE: SymbolMatch[] = [
  { symbol: "AAPL", description: "Apple Inc" },
  { symbol: "MSFT", description: "Microsoft Corp" },
  { symbol: "GOOGL", description: "Alphabet Inc Class A" },
  { symbol: "AMZN", description: "Amazon.com Inc" },
  { symbol: "NVDA", description: "NVIDIA Corp" },
  { symbol: "META", description: "Meta Platforms Inc" },
  { symbol: "TSLA", description: "Tesla Inc" },
  { symbol: "NFLX", description: "Netflix Inc" },
  { symbol: "AMD", description: "Advanced Micro Devices" },
  { symbol: "INTC", description: "Intel Corp" },
  { symbol: "JPM", description: "JPMorgan Chase & Co" },
  { symbol: "V", description: "Visa Inc" },
  { symbol: "DIS", description: "Walt Disney Co" },
  { symbol: "KO", description: "Coca-Cola Co" },
  { symbol: "BA", description: "Boeing Co" },
  { symbol: "SPY", description: "SPDR S&P 500 ETF Trust" },
  { symbol: "QQQ", description: "Invesco QQQ Trust" },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  if (!hasFinnhub()) {
    return simulatedQuote(sym);
  }

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${process.env.FINNHUB_API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return simulatedQuote(sym);
    const data = (await res.json()) as {
      c: number; // current
      pc: number; // previous close
      d: number | null; // change
      dp: number | null; // change percent
    };
    // Finnhub returns c === 0 for unknown symbols.
    if (!data || !data.c) return null;
    return {
      symbol: sym,
      price: data.c,
      prevClose: data.pc,
      change: data.d ?? data.c - data.pc,
      changePercent: data.dp ?? ((data.c - data.pc) / data.pc) * 100,
      simulated: false,
    };
  } catch {
    return simulatedQuote(sym);
  }
}

export async function searchSymbols(query: string): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (!q) return [];

  if (!hasFinnhub()) {
    const upper = q.toUpperCase();
    return SIM_UNIVERSE.filter(
      (s) =>
        s.symbol.includes(upper) ||
        s.description.toUpperCase().includes(upper)
    ).slice(0, 10);
  }

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(q)}&token=${process.env.FINNHUB_API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      result?: { symbol: string; description: string; type: string }[];
    };
    return (data.result ?? [])
      // Keep plain equities/ETFs with simple tickers.
      .filter((r) => r.symbol && !r.symbol.includes(".") && r.type === "Common Stock")
      .slice(0, 10)
      .map((r) => ({ symbol: r.symbol, description: r.description }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Historical series (for charts)
// ---------------------------------------------------------------------------

export type Candle = { t: number; c: number };

// Small seeded PRNG so a symbol's chart is stable across requests.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";

const DAY_MS = 86_400_000;

// Point count and spacing per range. Intraday ranges use finer steps.
const RANGE_CONFIG: Record<ChartRange, { points: number; stepMs: number }> = {
  "1D": { points: 78, stepMs: 5 * 60_000 }, // ~6.5h of 5-min bars
  "1W": { points: 56, stepMs: 3 * 60 * 60_000 }, // 3-hour bars over a week
  "1M": { points: 30, stepMs: DAY_MS },
  "3M": { points: 90, stepMs: DAY_MS },
  "1Y": { points: 365, stepMs: DAY_MS },
};

export function isChartRange(s: string): s is ChartRange {
  return Object.prototype.hasOwnProperty.call(RANGE_CONFIG, s);
}

/**
 * Price series for a symbol over a range, ending exactly at the current quote.
 *
 * Finnhub's free tier no longer serves candles, so we synthesize a deterministic
 * random walk seeded by the symbol and anchored to the live (or simulated)
 * price. Per-step volatility scales with the step size (√time), so intraday
 * ranges look calm and yearly ranges show larger swings. Stable per symbol, and
 * the last point always matches the quote.
 */
export async function getSeries(
  symbol: string,
  range: ChartRange = "3M"
): Promise<Candle[]> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return [];

  const { points, stepMs } = RANGE_CONFIG[range];
  const quote = await getQuote(sym);
  const end = quote?.price ?? 100;

  // ±2% daily vol, scaled to the step size so shorter bars move less.
  const amplitude = 0.04 * Math.sqrt(stepMs / DAY_MS);

  const rand = mulberry32(hashString(sym));
  // Walk backwards from the current price, then reverse so it ends at `end`.
  const closes: number[] = [];
  let v = end;
  for (let i = 0; i < points; i++) {
    closes.push(v);
    const shock = (rand() - 0.5) * amplitude;
    v = v / (1 + shock);
    if (v < 1) v = 1;
  }
  closes.reverse();

  const now = Date.now();
  return closes.map((c, i) => ({
    t: now - (points - 1 - i) * stepMs,
    c: +c.toFixed(2),
  }));
}
