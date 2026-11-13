import "server-only";

// SMS fallback via MSG91 (the cheapest India-first option, per
// replica/architecture.md) — used when a customer has opted out of
// WhatsApp, or when the WhatsApp send itself fails.
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
  return { messageId: json.request_id ?? "unknown" };
}
