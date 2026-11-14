"use client";

import { useActionState } from "react";
import { sendBillAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function SendBillButton({ transactionId, alreadySent }: { transactionId: string; alreadySent: boolean }) {
  const [state, formAction, pending] = useActionState(sendBillAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="transactionId" value={transactionId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
      >
        {pending ? "Sending…" : alreadySent ? "Resend bill" : "Send bill"}
      </button>
      {state.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
      {!state.error && !pending && alreadySent && <p className="text-xs text-muted">Sent ✓</p>}
    </form>
  );
}
