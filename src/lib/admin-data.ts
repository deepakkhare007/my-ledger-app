import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Reminder } from "./types";

// Data access for contexts with no user session at all: the Razorpay and
// WhatsApp webhooks, and the reminder-dispatch cron job. Uses the
// service-role client (bypasses RLS) — callers must verify the request
// themselves first (webhook signature, cron secret). See
// src/lib/supabase/admin.ts.

export async function getReminderByRazorpayLinkId(linkId: string): Promise<Reminder | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("razorpay_payment_link_id", linkId)
    .maybeSingle();

  if (error) throw new Error(`getReminderByRazorpayLinkId: ${error.message}`);
  if (!data) return undefined;
  return {
    id: data.id,
    customerId: data.customer_id,
    scheduledFor: data.scheduled_for,
    channel: data.channel,
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function markReminderPaidAdmin(reminderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "paid" })
    .eq("id", reminderId);

  if (error) throw new Error(`markReminderPaidAdmin: ${error.message}`);
}

export async function markWhatsAppMessageStatusAdmin(
  whatsappMessageId: string,
  status: "sent" | "failed",
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (error) throw new Error(`markWhatsAppMessageStatusAdmin: ${error.message}`);
}

// Honors an inbound STOP/UNSUBSCRIBE reply. Matches by phone number rather
// than a single customer_id, since the same shopper's number may recur
// across khata books — their opt-out is their own, not scoped to one shop.
export async function recordWhatsAppOptOutAdmin(phoneNumber: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ whatsapp_opt_out: true })
    .eq("phone_number", phoneNumber)
    .select("id");

  if (error) throw new Error(`recordWhatsAppOptOutAdmin: ${error.message}`);
  return data?.length ?? 0;
}

// For the reminder-dispatch cron job (Supabase Edge Function + pg_cron, per
// replica/architecture.md) — finds everything due to send right now.
export async function listDueRemindersAdmin(): Promise<
  Array<Reminder & { customerPhone: string | null; customerOptedOut: boolean }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*, customers(phone_number, whatsapp_opt_out)")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString());

  if (error) throw new Error(`listDueRemindersAdmin: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    scheduledFor: row.scheduled_for,
    channel: row.channel,
    status: row.status,
    createdAt: row.created_at,
    customerPhone: row.customers?.phone_number ?? null,
    customerOptedOut: Boolean(row.customers?.whatsapp_opt_out),
  }));
}
