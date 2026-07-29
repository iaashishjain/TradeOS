import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "TradeOS — Trading Performance OS",
  description: "Intelligent trading improvement platform for Forex, Crypto, Commodities & CFDs",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-950 text-dark-100 antialiased min-h-screen">
        <Sidebar />
        <main className="min-h-screen overflow-y-auto pl-0">{children}</main>
      </body>
    </html>
  );
}
