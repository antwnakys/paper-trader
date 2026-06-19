import { describe, expect, it } from "vitest";

import { getQuote, getSeries, isChartRange, searchSymbols } from "@/lib/market";

// With no FINNHUB_API_KEY set (as in CI), the simulated engine is used.
describe("market data (simulated engine)", () => {
  it("returns deterministic quotes per symbol", async () => {
    const a = await getQuote("AAPL");
    const b = await getQuote("AAPL");
    expect(a).not.toBeNull();
    expect(a?.simulated).toBe(true);
    expect(a?.price).toBe(b?.price);
    expect(a!.price).toBeGreaterThan(0);
  });

  it("builds a series with the right length and positive prices", async () => {
    const series = await getSeries("MSFT", "1M");
    expect(series).toHaveLength(30);
    expect(series.every((p) => p.c > 0)).toBe(true);
    // Timestamps strictly increasing.
    for (let i = 1; i < series.length; i++) {
      expect(series[i].t).toBeGreaterThan(series[i - 1].t);
    }
  });

  it("validates chart ranges", () => {
    expect(isChartRange("1D")).toBe(true);
    expect(isChartRange("1Y")).toBe(true);
    expect(isChartRange("5Y")).toBe(false);
    expect(isChartRange("")).toBe(false);
  });

  it("searches the simulated universe", async () => {
    const results = await searchSymbols("apple");
    expect(results.some((r) => r.symbol === "AAPL")).toBe(true);
  });
});
