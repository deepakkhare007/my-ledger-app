import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { getReminderByRazorpayLinkId, markReminderPaidAdmin } from "@/lib/admin-data";

// Idempotency: Razorpay retries webhooks on timeout/non-2xx, and re-marking
// an already-"paid" reminder paid again is a harmless no-op — there's no
// separate "processed event ids" table needed here, only because the only
// side effect is a status flip, not something that double-fires (e.g. a
// second SMS). If a future handler here ever sends a message, add an event
// id dedupe table before that ships.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment_link.paid") {
    const linkId: string | undefined = event.payload?.payment_link?.entity?.id;
    if (linkId) {
      const reminder = await getReminderByRazorpayLinkId(linkId);
      if (reminder) {
        await markReminderPaidAdmin(reminder.id);
      }
    }
  }

  // Always 200 on a verified, recognized event (even one we don't act on) —
  // a non-2xx here makes Razorpay retry forever.
  return NextResponse.json({ ok: true });
}
