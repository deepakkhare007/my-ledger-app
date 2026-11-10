import Link from "next/link";
import { Card } from "@/components/ui/Card";

// Shell placeholder for a screen the recon map lists but the current build
// step hasn't reached yet. See replica/build-log.md for status per screen.
export function Stub({
  screenId,
  title,
  purpose,
}: {
  screenId: string;
  title: string;
  purpose: string;
}) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <Card>
        <p className="text-sm font-medium text-muted">{screenId}</p>
        <h1 className="mt-1 text-lg font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{purpose}</p>
        <p className="mt-4 text-sm text-warning">Not built yet — stub route only.</p>
      </Card>
      <Link href="/customers" className="text-sm font-medium text-accent underline">
        Back to customers
      </Link>
    </main>
  );
}
