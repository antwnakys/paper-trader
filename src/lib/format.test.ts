import { describe, expect, it } from "vitest";

import { fmtMoney, fmtNumber, fmtPercent, pnlClass } from "@/lib/format";

describe("format helpers", () => {
  it("formats money", () => {
    expect(fmtMoney(1000)).toBe("$1,000.00");
    expect(fmtMoney(-5.5)).toBe("-$5.50");
    expect(fmtMoney(10, { sign: true })).toBe("+$10.00");
    // Negative values never get a leading + even with sign on.
    expect(fmtMoney(-3, { sign: true })).toBe("-$3.00");
  });

  it("formats percentages with an explicit sign", () => {
    expect(fmtPercent(2.5)).toBe("+2.50%");
    expect(fmtPercent(-1)).toBe("-1.00%");
    expect(fmtPercent(0)).toBe("0.00%");
  });

  it("formats share counts", () => {
    expect(fmtNumber(1.23456789)).toBe("1.2346");
    expect(fmtNumber(250)).toBe("250");
  });

  it("maps P&L to color classes", () => {
    expect(pnlClass(1)).toContain("up");
    expect(pnlClass(-1)).toContain("down");
    expect(pnlClass(0)).toContain("muted");
  });
});
