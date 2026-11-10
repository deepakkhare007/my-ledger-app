import { notFound } from "next/navigation";
import { NewTransactionForm } from "@/components/ledger/NewTransactionForm";
import { getCustomer } from "@/lib/store";
import type { TransactionType } from "@/lib/types";

export const instant = false;

// S05 — Add transaction.
export default async function NewTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type: rawType } = await searchParams;
  const customer = getCustomer(id);

  if (!customer) {
    notFound();
  }

  const type: TransactionType = rawType === "you_got" ? "you_got" : "you_gave";

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="break-words text-lg font-bold text-ink">Add entry for {customer.name}</h1>
      <NewTransactionForm customerId={customer.id} type={type} />
    </main>
  );
}
