"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { deleteAccountAction } from "@/lib/actions";

// Two-step confirm: the first click reveals the real, destructive button
// rather than firing it immediately — this is permanent, cascades through
// every khata book, customer, transaction and reminder, with no undo.
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete my account
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-danger bg-danger/5 p-4">
      <p className="text-sm text-danger">
        This permanently deletes your account and every khata book, customer, transaction and
        reminder in it. This cannot be undone — download your data first if you haven&apos;t.
      </p>
      <form action={deleteAccountAction} className="flex gap-3">
        <Button type="submit" variant="danger">
          Yes, permanently delete everything
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </form>
    </div>
  );
}
