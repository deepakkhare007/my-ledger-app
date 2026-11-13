"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addTransactionAction, type ActionState } from "@/lib/actions";
import type { TransactionType } from "@/lib/types";

const initialState: ActionState = {};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewTransactionForm({
  customerId,
  type,
}: {
  customerId: string;
  type: TransactionType;
}) {
  const [state, formAction, pending] = useActionState(addTransactionAction, initialState);
  const isGave = type === "you_gave";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="type" value={type} />

      <div
        className={`rounded-md px-3 py-2 text-sm font-semibold ${
          isGave ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
        }`}
      >
        {isGave ? "You Gave — a credit entry (they owe you more)" : "You Got — a payment (they owe you less)"}
      </div>

      {/* No `required`: see NewCustomerForm.tsx — the server action's own
          validation and styled error cover this consistently. */}
      <Input label="Amount (₹)" name="amount" numeric placeholder="0" />
      <Input label="Note (optional)" name="note" placeholder="e.g. 2 bags rice" />
      <Input label="Date" name="transactionDate" type="date" defaultValue={today()} required />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ink">Payment mode (optional)</legend>
        <select
          name="paymentMode"
          defaultValue=""
          className="h-12 rounded-sm border border-input bg-bg px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Not specified</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank transfer</option>
          <option value="other">Other</option>
        </select>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={pending}>
        Save
      </Button>
    </form>
  );
}
