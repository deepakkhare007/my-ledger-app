"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { scheduleAndSendReminderAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

function defaultDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 7); // quick-pick default: next week
  return d.toISOString().slice(0, 16);
}

export function ReminderForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(scheduleAndSendReminderAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="customerId" value={customerId} />

      <Input label="Send on" name="scheduledFor" type="datetime-local" defaultValue={defaultDateTime()} required />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Send via</legend>
        <div className="flex gap-3">
          <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-ink has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="radio" name="channel" value="whatsapp" defaultChecked className="accent-[var(--accent)]" />
            WhatsApp
          </label>
          <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-ink has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="radio" name="channel" value="sms" className="accent-[var(--accent)]" />
            SMS
          </label>
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={pending}>
        Send reminder
      </Button>
      <p className="text-sm text-muted">
        Simulated in this build — replica-backend wires this to the real WhatsApp Business
        Cloud API, with SMS as a fallback.
      </p>
    </form>
  );
}
