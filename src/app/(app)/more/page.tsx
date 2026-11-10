import Link from "next/link";

const links = [
  { href: "/books", label: "Khata books (S08)" },
  { href: "/business-card", label: "Business card (S09)" },
  { href: "/qr-code", label: "QR code (S10)" },
  { href: "/bank-account", label: "Bank account (S11)" },
  { href: "/inventory", label: "Inventory (S14)" },
  { href: "/reports", label: "Reports (S15)" },
  { href: "/invoices/new", label: "New invoice — v2 (S16)" },
  { href: "/settings/app-lock", label: "App lock (S12)" },
  { href: "/settings/language", label: "Language (S13)" },
  { href: "/login", label: "Sign-in screen (S01)" },
  { href: "/design", label: "Design system check" },
];

export default function MorePage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-2 p-4">
      <h1 className="mb-2 text-lg font-bold text-ink">More</h1>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex h-12 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {l.label}
        </Link>
      ))}
    </main>
  );
}
