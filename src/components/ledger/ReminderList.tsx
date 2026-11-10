import { Badge } from "@/components/ui/Badge";
import { markReminderPaidAction } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import type { Reminder } from "@/lib/types";

const statusVariant = {
  pending: "neutral",
  sent: "neutral",
  failed: "outflow",
  paid: "inflow",
} as const;

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No reminders sent yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg p-3"
        >
          <div>
            <p className="text-sm text-ink">
              {r.channel === "whatsapp" ? "WhatsApp" : r.channel === "sms" ? "SMS" : "UPI link"} ·{" "}
              {formatDate(r.scheduledFor)}
            </p>
            <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
          </div>
          {r.status !== "paid" && (
            <form action={markReminderPaidAction}>
              <input type="hidden" name="reminderId" value={r.id} />
              <input type="hidden" name="customerId" value={r.customerId} />
              <button
                type="submit"
                className="h-11 rounded-md border border-border px-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Mark as paid
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
