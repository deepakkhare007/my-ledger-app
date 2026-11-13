"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import * as store from "./store";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendReminderNow } from "@/lib/reminders";
import { createPaymentLink } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { error?: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ---------------------------------------------------------------------------
// Auth (S01)
// ---------------------------------------------------------------------------

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number with country code, e.g. +919876500001");

export async function requestOtpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid phone number" };
  }

  // 5 OTP requests per phone number per 10 minutes. Supabase Auth has its
  // own rate limits too; this just stops one phone number from burning
  // through them (and the SMS cost) from our own side first.
  const limited = rateLimit(`otp:${parsed.data}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
  if (error) {
    return { error: error.message };
  }
  return {};
}

const otpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{4,8}$/, "Enter the code you received"),
});

export async function verifyOtpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = otpSchema.safeParse({
    phone: formData.get("phone"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const ip = await clientIp();
  const limited = rateLimit(`otp-verify:${ip}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.otp,
    type: "sms",
  });
  if (error) {
    return { error: "That code didn't work. Check it and try again." };
  }

  redirect("/customers");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Deletes the auth.users row via the admin API, which cascades through
// profiles -> khata_books -> customers/transactions/reminders/... via the
// "on delete cascade" foreign keys in 0001_init.sql. Apple requires this for
// any app with sign-up (App Store Review Guideline 5.1.1(v)); it's also the
// honest end of the "your data is yours" promise in fixes.md — export
// before you delete, since this cannot be undone.
export async function deleteAccountAction() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(`Account deletion failed: ${error.message}`);
  }
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Customers (S03) / transactions (S05)
// ---------------------------------------------------------------------------

const nameSchema = z.string().trim().min(1, "Customer name is required").max(120, "Keep it under 120 characters");
const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v ? v : null));

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) {
    return { error: name.error.issues[0]?.message ?? "Enter a name" };
  }
  const phoneNumber = optionalPhoneSchema.parse(formData.get("phoneNumber") ?? undefined);

  const book = await store.getDefaultBook();
  const customer = await store.createCustomer({
    khataBookId: book.id,
    name: name.data,
    phoneNumber,
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

const positiveAmount = z
  // A plain z.coerce.number() surfaces its own "Expected number, received
  // NaN" message for non-numeric input before .positive()'s custom message
  // ever runs — confusing, leaky wording for a shopkeeper who typed letters
  // into an amount field. Validating the raw string ourselves keeps one
  // friendly message for every bad input (empty, zero, negative, "abc").
  .string()
  .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Enter an amount greater than zero")
  .transform((v) => Number(v));

const transactionSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(["you_gave", "you_got"]),
  amount: positiveAmount,
  note: z.string().trim().max(500).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMode: z.enum(["cash", "upi", "bank", "other"]).optional().or(z.literal("")),
});

export async function addTransactionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = transactionSchema.safeParse({
    customerId: formData.get("customerId"),
    type: formData.get("type"),
    amount: String(formData.get("amount") ?? ""),
    note: formData.get("note"),
    transactionDate: formData.get("transactionDate"),
    paymentMode: formData.get("paymentMode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const book = await store.getDefaultBook();
  await store.addTransaction({
    customerId: parsed.data.customerId,
    khataBookId: book.id,
    type: parsed.data.type,
    amountCents: Math.round(parsed.data.amount * 100),
    paymentMode: parsed.data.paymentMode || null,
    note: parsed.data.note || null,
    transactionDate: parsed.data.transactionDate,
  });

  revalidatePath(`/customers/${parsed.data.customerId}`);
  revalidatePath("/customers");
  redirect(`/customers/${parsed.data.customerId}`);
}

// ---------------------------------------------------------------------------
// Reminders (S07)
// ---------------------------------------------------------------------------

const reminderSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.enum(["whatsapp", "sms"]),
  scheduledFor: z.string().min(1, "Pick a date"),
});

export async function scheduleAndSendReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = reminderSchema.safeParse({
    customerId: formData.get("customerId"),
    channel: formData.get("channel"),
    scheduledFor: formData.get("scheduledFor"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pick a date and a channel" };
  }

  // 10 reminder sends per customer per hour — a shopkeeper pressing "send"
  // repeatedly shouldn't be able to spam one customer's phone.
  const limited = rateLimit(`reminder:${parsed.data.customerId}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Too many reminders sent to this customer recently. Try again later." };
  }

  const customer = await store.getCustomer(parsed.data.customerId);
  if (!customer) {
    return { error: "Customer not found" };
  }
  const balanceCents = await store.getCustomerBalanceCents(parsed.data.customerId);

  const reminder = await store.scheduleReminder({
    customerId: parsed.data.customerId,
    scheduledFor: parsed.data.scheduledFor,
    channel: parsed.data.channel,
  });

  const result = await sendReminderNow({
    customerPhone: customer.phoneNumber,
    customerName: customer.name,
    amountCents: Math.max(balanceCents, 0),
    preferWhatsApp: parsed.data.channel === "whatsapp",
    optedOutOfWhatsApp: customer.whatsappOptOut,
  });

  if (result.status === "sent") {
    await store.setReminderStatus(reminder.id, "sent", { whatsappMessageId: result.messageId });
  } else {
    await store.setReminderStatus(reminder.id, "failed");
  }

  revalidatePath(`/customers/${parsed.data.customerId}/remind`);

  if (result.status === "failed") {
    return { error: `Couldn't send the reminder: ${result.error}` };
  }
  return {};
}

export async function requestUpiPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const customerId = String(formData.get("customerId") ?? "");
  const parsedId = z.string().uuid().safeParse(customerId);
  if (!parsedId.success) {
    return { error: "Customer not found" };
  }

  const limited = rateLimit(`upi-link:${customerId}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Too many payment links requested recently. Try again later." };
  }

  const customer = await store.getCustomer(customerId);
  if (!customer) {
    return { error: "Customer not found" };
  }
  const balanceCents = await store.getCustomerBalanceCents(customerId);
  if (balanceCents <= 0) {
    return { error: "Nothing outstanding to request from this customer" };
  }

  const reminder = await store.scheduleReminder({
    customerId,
    scheduledFor: new Date().toISOString(),
    channel: "upi_link",
  });

  try {
    const link = await createPaymentLink({
      amountCents: balanceCents,
      customerName: customer.name,
      customerPhone: customer.phoneNumber,
      referenceId: reminder.id,
    });

    const result = await sendReminderNow({
      customerPhone: customer.phoneNumber,
      customerName: customer.name,
      amountCents: balanceCents,
      preferWhatsApp: !customer.whatsappOptOut,
      optedOutOfWhatsApp: customer.whatsappOptOut,
    });

    await store.setReminderStatus(reminder.id, result.status === "sent" ? "sent" : "failed", {
      razorpayPaymentLinkId: link.id,
    });
  } catch (err) {
    await store.setReminderStatus(reminder.id, "failed");
    return { error: err instanceof Error ? err.message : "Couldn't create the payment link" };
  }

  revalidatePath(`/customers/${customerId}/remind`);
  return {};
}

export async function markReminderPaidAction(formData: FormData) {
  await requireUser();

  const reminderId = String(formData.get("reminderId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");

  if (!reminderId) {
    throw new Error("Missing reminder");
  }

  // Manual override for cash/SMS/WhatsApp reminders, which have no webhook
  // to confirm payment automatically — the Razorpay webhook
  // (api/webhooks/razorpay) is the authoritative path for UPI-link
  // reminders and will also mark them paid without this button being used.
  await store.setReminderStatus(reminderId, "paid");
  revalidatePath(`/customers/${customerId}/remind`);
}
