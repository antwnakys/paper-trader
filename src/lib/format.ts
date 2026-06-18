// Display formatting helpers shared across client components.

export function fmtMoney(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : "";
  return (
    sign +
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function pnlClass(n: number): string {
  if (n > 0) return "text-up";
  if (n < 0) return "text-down";
  return "text-muted";
}
