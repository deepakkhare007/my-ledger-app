import Link from "next/link";
import { CustomerList, type CustomerRowData } from "@/components/ledger/CustomerList";
import { formatRupees } from "@/lib/format";
import {
  getCustomerBalanceCents,
  getDefaultBook,
  listCustomers,
  listTransactions,
} from "@/lib/store";

// S02 — Khata (customer list) home. Default landing screen.
export default function CustomersPage() {
  const book = getDefaultBook();
  const customers = listCustomers(book.id);

  const rows: CustomerRowData[] = customers.map((c) => {
    const txns = listTransactions(c.id);
    return {
      id: c.id,
      name: c.name,
      balanceCents: getCustomerBalanceCents(c.id),
      lastEntryAt: txns[0]?.createdAt ?? null,
    };
  });

  const totalToReceive = rows.reduce((sum, r) => sum + Math.max(r.balanceCents, 0), 0);
  const totalToGive = rows.reduce((sum, r) => sum + Math.max(-r.balanceCents, 0), 0);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-sm text-muted">You&apos;ll get</p>
          <p className="text-lg font-bold text-success">{formatRupees(totalToReceive)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">You&apos;ll give</p>
          <p className="text-lg font-bold text-danger">{formatRupees(totalToGive)}</p>
        </div>
      </div>

      {/* Styled as a primary Button, but rendered as a single <a> to /customers/new (S03) */}
      <Link
        href="/customers/new"
        className="flex h-12 w-full items-center justify-center rounded-md bg-accent px-5 text-base font-semibold text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        + Add customer
      </Link>

      <CustomerList customers={rows} />
    </main>
  );
}
