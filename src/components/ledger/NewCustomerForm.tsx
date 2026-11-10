"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCustomerAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function NewCustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Customer name" name="name" placeholder="e.g. Ramesh Kirana Store" required />
      <Input label="Phone number (optional)" name="phoneNumber" type="tel" placeholder="+91" />
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
