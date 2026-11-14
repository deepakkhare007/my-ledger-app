import "server-only";

// SMS fallback via MSG91 (the cheapest India-first option, per
// replica/architecture.md) — used when a customer has opted out of
// WhatsApp, or when the WhatsApp send itself fails.
//
// IMPORTANT caveat, confirmed by hand against the real endpoint while
// building the bill-send feature: POST /api/v5/flow/ returns HTTP 200
// with {"type":"success"} even for a bogus authkey, a bogus template_id,
// or a missing "recipients" field entirely — it does not validate
// synchronously. So `res.ok` (and the "success" type) only means MSG91's
// API accepted the HTTP request, not that the authkey/template are real
// or that anything will actually be delivered; a genuinely bad account
// only shows up later, in MSG91's own delivery-report dashboard. There is
// no way to tell "really sent" from "silently misconfigured" from this
// response alone — local testing with placeholder creds will always
// report "sent". Before relying on this in production, either poll
// MSG91's delivery-report API or wire its DLR webhook.
export async function sendSmsReminder(input: {
  toE164: string;
  customerName: string;
  amountRupees: string;
}): Promise<{ messageId: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be set");
  }

  const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      recipients: [
        {
          mobiles: input.toE164.replace("+", ""),
          customer_name: input.customerName,
          amount: input.amountRupees,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 send failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  // MSG91's own tracking id comes back in "message", not "request_id"
  // (confirmed against the real endpoint above) — the old field name
  // always fell through to "unknown".
  return { messageId: json.message ?? "unknown" };
}

// Same MSG91 flow API as sendSmsReminder, but a separate DLT-registered
// template (MSG91_BILL_TEMPLATE_ID) since a bill's wording is different
// from a reminder's and Indian SMS content must match its registered
// template exactly.
export async function sendSmsBill(input: {
  toE164: string;
  customerName: string;
  entryLabel: string;
  amountRupees: string;
  balanceRupees: string;
}): Promise<{ messageId: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_BILL_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw new Error("MSG91_AUTH_KEY and MSG91_BILL_TEMPLATE_ID must be set");
  }

  const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      recipients: [
        {
          mobiles: input.toE164.replace("+", ""),
          customer_name: input.customerName,
          entry_label: input.entryLabel,
          amount: input.amountRupees,
          balance: input.balanceRupees,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 bill send failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { messageId: json.message ?? "unknown" };
}
