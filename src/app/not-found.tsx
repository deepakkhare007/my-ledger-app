import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-bold text-ink">Not found</h1>
      <p className="max-w-sm text-sm text-muted">
        That customer or page doesn&apos;t exist, or it was moved.
      </p>
      <Link href="/customers" className="text-sm font-medium text-accent underline">
        Back to customers
      </Link>
    </main>
  );
}
