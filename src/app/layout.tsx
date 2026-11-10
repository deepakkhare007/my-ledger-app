import type { Metadata } from "next";
import { Hind, Geist_Mono } from "next/font/google";
import "./globals.css";

// Hind pairs Devanagari and Latin in one open family (Indian Type Foundry,
// via Google Fonts) — see replica/design/tokens.json for why this replaces
// the scaffold's Geist default: Geist has no Devanagari glyphs at all.
const hind = Hind({
  variable: "--font-hind",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledger (working title)",
  description: "A digital khata for Indian shopkeepers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hind.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
