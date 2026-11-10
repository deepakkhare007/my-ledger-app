import { NewCustomerForm } from "@/components/ledger/NewCustomerForm";

// S03 — Add customer.
export default function NewCustomerPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-lg font-bold text-ink">Add customer</h1>
      <NewCustomerForm />
    </main>
  );
}
