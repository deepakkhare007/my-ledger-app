import "server-only";
import { sendWhatsAppReminder } from "@/lib/whatsapp";
import { sendSmsReminder } from "@/lib/sms";
import { formatRupees } from "@/lib/format";

export type SendReminderResult =
  | { status: "sent"; channel: "whatsapp" | "sms"; messageId: string }
  | { status: "failed"; error: string };

// Shared by the user-triggered "send now" action (S07) and the
// reminder-dispatch cron job: tries WhatsApp first (unless the customer has
// opted out), falls back to SMS on any failure — this fallback is the real
// point of keeping SMS wired at all, per architecture.md's note that
// WhatsApp approval/rate limits are the most likely thing to delay this
// flow in practice.
export async function sendReminderNow(input: {
  customerPhone: string | null;
  customerName: string;
  amountCents: number;
  preferWhatsApp: boolean;
  optedOutOfWhatsApp: boolean;
}): Promise<SendReminderResult> {
  if (!input.customerPhone) {
    return { status: "failed", error: "Customer has no phone number on file" };
  }

  const amountRupees = formatRupees(input.amountCents).replace("₹", "");

  if (input.preferWhatsApp && !input.optedOutOfWhatsApp) {
    try {
      const { messageId } = await sendWhatsAppReminder({
        toE164: input.customerPhone,
        customerName: input.customerName,
        amountRupees,
      });
      return { status: "sent", channel: "whatsapp", messageId };
    } catch (whatsappError) {
      // Fall through to SMS — logged, not swallowed silently.
      console.error("WhatsApp send failed, falling back to SMS", whatsappError);
    }
  }

  try {
    const { messageId } = await sendSmsReminder({
      toE164: input.customerPhone,
      customerName: input.customerName,
      amountRupees,
    });
    return { status: "sent", channel: "sms", messageId };
  } catch (smsError) {
    return { status: "failed", error: smsError instanceof Error ? smsError.message : String(smsError) };
  }
}
