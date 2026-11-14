import "server-only";
import { sendWhatsAppBill } from "@/lib/whatsapp";
import { sendSmsBill } from "@/lib/sms";
import { formatRupees } from "@/lib/format";

export type SendBillResult =
  | { status: "sent"; channel: "whatsapp" | "sms"; messageId: string }
  | { status: "failed"; error: string };

// Same WhatsApp-first-then-SMS-fallback shape as sendReminderNow (see
// src/lib/reminders.ts), but for a bill copy of a transaction that was just
// recorded rather than a payment ask.
export async function sendBillNow(input: {
  customerPhone: string | null;
  customerName: string;
  shopName: string;
  entryLabel: string; // "You Gave" | "You Got"
  amountCents: number;
  balanceCents: number;
  optedOutOfWhatsApp: boolean;
}): Promise<SendBillResult> {
  if (!input.customerPhone) {
    return { status: "failed", error: "Customer has no phone number on file" };
  }

  const amountRupees = formatRupees(input.amountCents).replace("₹", "");
  const balanceRupees = formatRupees(Math.abs(input.balanceCents)).replace("₹", "");

  if (!input.optedOutOfWhatsApp) {
    try {
      const { messageId } = await sendWhatsAppBill({
        toE164: input.customerPhone,
        shopName: input.shopName,
        customerName: input.customerName,
        entryLabel: input.entryLabel,
        amountRupees,
        balanceRupees,
      });
      return { status: "sent", channel: "whatsapp", messageId };
    } catch (whatsappError) {
      console.error("WhatsApp bill send failed, falling back to SMS", whatsappError);
    }
  }

  try {
    const { messageId } = await sendSmsBill({
      toE164: input.customerPhone,
      customerName: input.customerName,
      entryLabel: input.entryLabel,
      amountRupees,
      balanceRupees,
    });
    return { status: "sent", channel: "sms", messageId };
  } catch (smsError) {
    return { status: "failed", error: smsError instanceof Error ? smsError.message : String(smsError) };
  }
}
