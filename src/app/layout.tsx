import type { Metadata } from "next";

import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperTrader — Practice Stock Trading",
  description:
    "A free paper trading platform. Create up to 20 accounts, set your starting balance, and trade US stocks with live prices — no real money.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
