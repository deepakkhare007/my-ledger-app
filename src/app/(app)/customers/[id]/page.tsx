import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceBadge } from "@/components/ledger/BalanceBadge";
import { TransactionRow } from "@/components/ledger/TransactionRow";
import { getCustomer, getCustomerBalanceCents, listTransactions } from "@/lib/store";

// S04 — Customer ledger detail.
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  const balanceCents = await getCustomerBalanceCents(customer.id);
  const transactions = await listTransactions(customer.id);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h1 className="break-words text-lg font-bold text-ink">{customer.name}</h1>
        {customer.phoneNumber && <p className="text-sm text-muted">{customer.phoneNumber}</p>}
        <div className="mt-2">
          <BalanceBadge balanceCents={balanceCents} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/customers/${customer.id}/transactions/new?type=you_gave`}
          className="flex h-12 items-center justify-center rounded-md bg-danger px-4 text-base font-semibold text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          You Gave
        </Link>
        <Link
          href={`/customers/${customer.id}/transactions/new?type=you_got`}
          className="flex h-12 items-center justify-center rounded-md bg-success px-4 text-base font-semibold text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          You Got
        </Link>
      </div>

      <Link
        href={`/customers/${customer.id}/remind`}
        className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-bg px-4 text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Remind to pay
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No transactions yet. Tap &quot;You Gave&quot; or &quot;You Got&quot; to add the first one.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-bg px-4">
            {transactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
