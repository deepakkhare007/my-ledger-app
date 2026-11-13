import { Card } from "@/components/ui/Card";
import { DeleteAccountButton } from "@/components/ledger/DeleteAccountButton";

export default function AccountSettingsPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-4">
      <h1 className="text-lg font-bold text-ink">Your data</h1>

      <Card>
        <h2 className="font-semibold text-ink">Download everything</h2>
        <p className="mt-1 text-sm text-muted">
          A JSON file with every khata book, customer, transaction and reminder you have. Free,
          always — see replica/fixes.md for why.
        </p>
        <a
          href="/api/account/export"
          className="mt-3 inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Download my data
        </a>
      </Card>

      <Card>
        <h2 className="font-semibold text-ink">Delete your account</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your account and all its data. This cannot be undone.
        </p>
        <div className="mt-3">
          <DeleteAccountButton />
        </div>
      </Card>
    </main>
  );
}
