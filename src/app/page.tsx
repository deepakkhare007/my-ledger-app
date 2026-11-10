import Link from "next/link";

// Placeholder. Screens (S01, S02, ...) are built in /replica-build, on top of
// the primitives checked at /design.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold text-ink">Ledger (working title)</h1>
      <p className="max-w-sm text-sm text-muted">
        Screens aren&apos;t built yet — see{" "}
        <Link href="/design" className="font-medium text-accent underline">
          /design
        </Link>{" "}
        for the component primitives.
      </p>
    </main>
  );
}
