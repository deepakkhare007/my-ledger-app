import "server-only";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

function client() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Creates a UPI/card Payment Link for one customer's balance (F04 in
// recon.md — a payment *request*, never settlement we hold ourselves; see
// architecture.md's scope note on QR/bank-settlement being out of scope).
// Test mode by default: RAZORPAY_KEY_ID starting with "rzp_test_" until
// replica-deploy switches it to live keys.
export async function createPaymentLink(input: {
  amountCents: number;
  customerName: string;
  customerPhone: string | null;
  referenceId: string; // our reminder id, so the webhook can correlate it back
}): Promise<{ id: string; shortUrl: string }> {
  const rzp = client();

  const link = await rzp.paymentLink.create({
    amount: input.amountCents,
    currency: "INR",
    accept_partial: false,
    description: "Payment reminder",
    reference_id: input.referenceId,
    customer: {
      name: input.customerName,
      contact: input.customerPhone ?? undefined,
    },
    notify: { sms: false, email: false }, // we send the link ourselves, via WhatsApp/SMS
    callback_method: "get",
  });

  return { id: link.id, shortUrl: link.short_url };
}

// Payment Links webhooks send an HMAC-SHA256 signature of the raw body,
// keyed with the webhook secret set in the Razorpay dashboard (not the API
// key secret) — verify against the *raw* request body, before any JSON
// parsing, or a byte-for-byte reformatting will break verification.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET must be set");
  }
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
