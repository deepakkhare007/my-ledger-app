"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestOtpAction, verifyOtpAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [requestState, requestAction, requestPending] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      const result = await requestOtpAction(_prev, formData);
      if (!result.error) setOtpSent(true);
      return result;
    },
    initialState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction, initialState);

  if (!otpSent) {
    return (
      <form action={requestAction} className="flex flex-col gap-4">
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          placeholder="+919876500001"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        {requestState.error && (
          <p role="alert" className="text-sm text-danger">
            {requestState.error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={requestPending}>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <input type="hidden" name="phone" value={phone} />
      <p className="text-sm text-muted">Code sent to {phone}</p>
      <Input label="Enter the code" name="otp" inputMode="numeric" autoFocus required />
      {verifyState.error && (
        <p role="alert" className="text-sm text-danger">
          {verifyState.error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={verifyPending}>
        Verify &amp; sign in
      </Button>
      <button
        type="button"
        onClick={() => setOtpSent(false)}
        className="text-sm font-medium text-accent underline"
      >
        Use a different number
      </button>
    </form>
  );
}
