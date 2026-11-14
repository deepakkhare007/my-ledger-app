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
import { sendBillNow } from "@/lib/bill";
import { parseVoiceTransaction, type ParsedVoiceEntry } from "@/lib/voice";
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

// Dev-only shortcut: set DEV_OTP_BYPASS_CODE in .env.local (never commit a
// real value, never set it in production — double-guarded by NODE_ENV
// below too) to accept that one fixed code for ANY phone number, instead
// of needing one of config.toml's two [auth.sms.test_otp] numbers. Exists
// because local Supabase phone auth only recognizes those two seeded
// numbers; this unblocks testing with whatever number you want to type.
function devOtpBypassCode(): string | null {
  const code = process.env.DEV_OTP_BYPASS_CODE;
  if (process.env.NODE_ENV === "production" || !code) return null;
  return code;
}

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

  if (devOtpBypassCode()) {
    // Nothing to send — verifyOtpAction below checks the bypass code
    // itself without calling Supabase's real phone-OTP verify at all.
    return {};
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
  if (error) {
    // Supabase/Twilio's own error text ("Authentication Error - invalid
    // username" for the dummy local-dev Twilio credentials, for any phone
    // number that isn't one of config.toml's [auth.sms.test_otp] entries)
    // is a confusing, provider-internal message to show a shopkeeper —
    // same leak class as BUG-002. Log it for whoever's running the server
    // and show a message that's actually actionable instead.
    console.error("signInWithOtp failed", error);
    return {
      error:
        "Couldn't send the code. In local dev, sign in with the seeded test number " +
        "(+910000000001, code 123456) — see replica/backend.md.",
    };
  }
  return {};
}

const otpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{4,8}$/, "Enter the code you received"),
});

// Signs in as `phone` without ever calling Supabase's real phone-OTP
// verify — the only way to mint a session for an arbitrary phone number
// without a real SMS provider. The password is deterministic (derived
// from phone + the bypass code), so a repeat bypass login for the same
// number just signs straight in on the first try below; only a genuinely
// new number falls through to creating the user.
//
// Deliberately does NOT use admin.auth.admin.listUsers() to look up an
// existing user by phone on failure — confirmed by hand that this local
// Supabase CLI's listUsers endpoint itself 500s ("Database error finding
// users") regardless of input, so trying it here would trade one failure
// for another. Trying sign-in first sidesteps needing it at all for the
// common "log in again with the same bypass number" case.
async function signInViaDevBypass(phone: string): Promise<ActionState> {
  const devPassword = `dev-otp-bypass:${phone}:${process.env.DEV_OTP_BYPASS_CODE}`;
  const supabase = await createClient();

  const { error: firstAttemptError } = await supabase.auth.signInWithPassword({ phone, password: devPassword });
  if (!firstAttemptError) {
    redirect("/customers");
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    phone,
    password: devPassword,
    phone_confirm: true,
  });

  if (createError) {
    // The only realistic cause left: this phone already has a real
    // account (e.g. a seeded test_otp number) that wasn't created by this
    // bypass, so there's no bypass password to match against.
    return {
      error:
        "This number already has an account outside the dev bypass — sign in with its real code, " +
        "or use a different number for bypass testing.",
    };
  }

  const { error: secondAttemptError } = await supabase.auth.signInWithPassword({ phone, password: devPassword });
  if (secondAttemptError) {
    return { error: `Dev bypass sign-in failed: ${secondAttemptError.message}` };
  }

  redirect("/customers");
}

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

  const bypassCode = devOtpBypassCode();
  if (bypassCode && parsed.data.otp === bypassCode) {
    return signInViaDevBypass(parsed.data.phone);
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
// Voice entry
// ---------------------------------------------------------------------------

export type ParseVoiceEntryResult =
  | { ok: true; data: ParsedVoiceEntry }
  | { ok: false; error: string };

// Not a useActionState form action — the client calls this directly right
// after Web Speech API hands it a transcript, before there's a form to
// submit at all. See VoiceEntryFlow.tsx.
export async function parseVoiceEntryAction(transcript: string): Promise<ParseVoiceEntryResult> {
  await requireUser();

  if (!transcript.trim()) {
    return { ok: false, error: "Didn't catch anything. Try again." };
  }

  const ip = await clientIp();
  const limited = rateLimit(`voice-parse:${ip}`, 20, 10 * 60 * 1000);
  if (!limited.ok) {
    return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  }

  const book = await store.getDefaultBook();
  const customers = await store.listCustomers(book.id);

  try {
    const data = await parseVoiceTransaction({
      transcript,
      customers: customers.map((c) => ({ id: c.id, name: c.name })),
    });
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't understand that. Try again or enter it manually.",
    };
  }
}

const voiceEntrySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    newCustomerName: z.string().trim().max(120).optional(),
    type: z.enum(["you_gave", "you_got"]),
    amount: positiveAmount,
    note: z.string().trim().max(500).optional(),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  })
  .refine((v) => Boolean(v.customerId) || Boolean(v.newCustomerName), {
    message: "Pick a customer or enter a name for the new one",
    path: ["customerId"],
  });

// The confirm step after parseVoiceEntryAction: creates the customer first
// if the shopkeeper is confirming a new one, then records the transaction
// exactly like addTransactionAction. Kept as one action (rather than
// reusing createCustomerAction + addTransactionAction) so the two writes
// share one validation pass and the redirect only happens once.
export async function confirmVoiceTransactionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = voiceEntrySchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    newCustomerName: formData.get("newCustomerName") || undefined,
    type: formData.get("type"),
    amount: String(formData.get("amount") ?? ""),
    note: formData.get("note"),
    transactionDate: formData.get("transactionDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const book = await store.getDefaultBook();
  let customerId = parsed.data.customerId;
  if (!customerId && parsed.data.newCustomerName) {
    const customer = await store.createCustomer({
      khataBookId: book.id,
      name: parsed.data.newCustomerName,
      phoneNumber: null,
    });
    customerId = customer.id;
  }
  if (!customerId) {
    return { error: "Pick a customer or enter a name for the new one" };
  }

  await store.addTransaction({
    customerId,
    khataBookId: book.id,
    type: parsed.data.type,
    amountCents: Math.round(parsed.data.amount * 100),
    paymentMode: null,
    note: parsed.data.note || null,
    transactionDate: parsed.data.transactionDate,
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
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

// ---------------------------------------------------------------------------
// Bill send — a receipt copy of one transaction, sent on request (not
// automatically on every save, so a customer who didn't ask for WhatsApp
// receipts doesn't get one every time).
// ---------------------------------------------------------------------------

export async function sendBillAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();

  const transactionId = String(formData.get("transactionId") ?? "");
  const parsedId = z.string().uuid().safeParse(transactionId);
  if (!parsedId.success) {
    return { error: "Transaction not found" };
  }

  const limited = rateLimit(`bill-send:${transactionId}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: "Too many bills sent for this transaction recently. Try again later." };
  }

  const transaction = await store.getTransaction(transactionId);
  if (!transaction) {
    return { error: "Transaction not found" };
  }
  const customer = await store.getCustomer(transaction.customerId);
  if (!customer) {
    return { error: "Customer not found" };
  }
  const book = await store.getDefaultBook();
  const balanceCents = await store.getCustomerBalanceCents(customer.id);

  const result = await sendBillNow({
    customerPhone: customer.phoneNumber,
    customerName: customer.name,
    shopName: book.businessName,
    entryLabel: transaction.type === "you_gave" ? "You Gave" : "You Got",
    amountCents: transaction.amountCents,
    balanceCents,
    optedOutOfWhatsApp: customer.whatsappOptOut,
  });

  await store.createBillSend({
    khataBookId: transaction.khataBookId,
    transactionId: transaction.id,
    channel: result.status === "sent" ? result.channel : "sms",
    status: result.status,
    error: result.status === "failed" ? result.error : undefined,
    providerMessageId: result.status === "sent" ? result.messageId : undefined,
  });

  revalidatePath(`/customers/${customer.id}`);

  if (result.status === "failed") {
    return { error: `Couldn't send the bill: ${result.error}` };
  }
  return {};
}
