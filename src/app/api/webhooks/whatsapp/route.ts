import { NextResponse } from "next/server";
import { isOptOutMessage, verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/whatsapp";
import { markWhatsAppMessageStatusAdmin, recordWhatsAppOptOutAdmin } from "@/lib/admin-data";

// Meta's one-time webhook registration handshake (Dashboard > Webhooks).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyWebhookChallenge(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      // Delivery/read status callbacks for messages we sent.
      for (const status of value?.statuses ?? []) {
        if (status.status === "failed") {
          await markWhatsAppMessageStatusAdmin(status.id, "failed");
        }
        // "sent"/"delivered"/"read" are left as-is — our own send call
        // already set "sent" optimistically; we only need to know about
        // failures here.
      }

      // Inbound messages — this is the opt-out keyword check that
      // architecture.md calls out as a day-one requirement, not a later
      // "growth" feature.
      for (const message of value?.messages ?? []) {
        const text: string | undefined = message.text?.body;
        const from: string | undefined = message.from; // digits only, no "+"
        if (text && from && isOptOutMessage(text)) {
          await recordWhatsAppOptOutAdmin(`+${from}`);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
