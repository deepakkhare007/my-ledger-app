"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as store from "./store";
import type { PaymentMode, ReminderChannel, TransactionType } from "./types";

export type ActionState = { error?: string };

function parseAmountCents(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const rupees = Number(raw);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();

  if (!name) {
    return { error: "Customer name is required" };
  }

  const book = store.getDefaultBook();
  const customer = store.createCustomer({
    khataBookId: book.id,
    name,
    phoneNumber: phoneNumber || null,
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function addTransactionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const type = String(formData.get("type") ?? "") as TransactionType;
  const amountCents = parseAmountCents(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim();
  const transactionDate = String(formData.get("transactionDate") ?? "").trim();
  const paymentMode = (String(formData.get("paymentMode") ?? "") || null) as PaymentMode | null;

  if (type !== "you_gave" && type !== "you_got") {
    return { error: "Unknown entry type" };
  }
  if (amountCents === null) {
    return { error: "Enter an amount greater than zero" };
  }
  if (!transactionDate) {
    return { error: "Pick a date" };
  }

  const book = store.getDefaultBook();
  store.addTransaction({
    customerId,
    khataBookId: book.id,
    type,
    amountCents,
    paymentMode,
    note: note || null,
    transactionDate,
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}

// Simulated send: replica-backend wires this to the real WhatsApp Business
// Cloud API (+ SMS fallback via MSG91), per replica/architecture.md. Here it
// just marks the reminder "sent" so the vertical slice's flow is complete
// end to end on fake data.
export async function scheduleAndSendReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerId = String(formData.get("customerId") ?? "");
  const channel = String(formData.get("channel") ?? "") as ReminderChannel;
  const scheduledFor = String(formData.get("scheduledFor") ?? "");

  if (!customerId) {
    return { error: "Missing customer" };
  }
  if (!scheduledFor) {
    return { error: "Pick a date" };
  }
  if (!["whatsapp", "sms", "upi_link"].includes(channel)) {
    return { error: "Pick how to send it" };
  }

  const reminder = store.scheduleReminder({ customerId, scheduledFor, channel });
  store.setReminderStatus(reminder.id, "sent");

  revalidatePath(`/customers/${customerId}/remind`);
  return {};
}

export async function markReminderPaidAction(formData: FormData) {
  const reminderId = String(formData.get("reminderId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");

  if (!reminderId) {
    throw new Error("Missing reminder");
  }

  store.setReminderStatus(reminderId, "paid");
  revalidatePath(`/customers/${customerId}/remind`);
}
