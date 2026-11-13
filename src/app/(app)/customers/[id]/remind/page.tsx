import { notFound } from "next/navigation";
import { ReminderForm } from "@/components/ledger/ReminderForm";
import { ReminderList } from "@/components/ledger/ReminderList";
import { getCustomer, listReminders } from "@/lib/store";

// S07 — Payment reminder / request.
export default async function RemindPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  const reminders = await listReminders(customer.id);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-4">
      <h1 className="break-words text-lg font-bold text-ink">Remind {customer.name}</h1>
      <ReminderForm customerId={customer.id} />
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Reminders sent</h2>
        <ReminderList reminders={reminders} />
      </section>
    </main>
  );
}
