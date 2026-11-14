import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = "v21.0";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

// Sends an approved "utility" category template (payment reminders don't
// need the 24-hour open-session window that a free-form message would).
// The template itself ("payment_reminder") is created and approved in Meta
// Business Manager — this function only fills its variables. See
// replica/architecture.md's note on new-sender messaging tiers and approval
// lead time.
export async function sendWhatsAppReminder(input: {
  toE164: string; // e.g. "+919876500001"
  customerName: string;
  amountRupees: string;
}): Promise<{ messageId: string }> {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.toE164.replace("+", ""),
      type: "template",
      template: {
        name: "payment_reminder",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.customerName },
              { type: "text", text: input.amountRupees },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp send returned no message id");
  return { messageId };
}

// Same shape as sendWhatsAppReminder but a different approved template
// ("transaction_receipt") — a bill confirms what was just recorded, a
// reminder asks for money outstanding, and WhatsApp template approval is
// per-template, so they can't share one. Keep the variable count fixed
// (5) since an approved template's body text and slot count can't change
// without re-approval.
export async function sendWhatsAppBill(input: {
  toE164: string;
  shopName: string;
  customerName: string;
  entryLabel: string; // "You Gave" | "You Got"
  amountRupees: string;
  balanceRupees: string;
}): Promise<{ messageId: string }> {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.toE164.replace("+", ""),
      type: "template",
      template: {
        name: "transaction_receipt",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.shopName },
              { type: "text", text: input.entryLabel },
              { type: "text", text: input.amountRupees },
              { type: "text", text: input.customerName },
              { type: "text", text: input.balanceRupees },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp bill send failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp send returned no message id");
  return { messageId };
}

// GET /api/webhooks/whatsapp verification handshake: Meta calls this once
// when you register the webhook URL in the dashboard.
export function verifyWebhookChallenge(mode: string | null, token: string | null): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
}

// Meta signs the POST body with your app secret (X-Hub-Signature-256:
// "sha256=<hex>") — verify against the *raw* body, before JSON parsing.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const appSecret = env("WHATSAPP_APP_SECRET");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader.slice("sha256=".length));
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

const STOP_KEYWORDS = new Set(["stop", "unsubscribe", "optout", "opt out", "band karo", "रोको"]);

export function isOptOutMessage(text: string): boolean {
  return STOP_KEYWORDS.has(text.trim().toLowerCase());
}
