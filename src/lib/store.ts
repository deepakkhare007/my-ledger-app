import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { BillSend, Customer, KhataBook, Reminder, Transaction } from "./types";

// Real Supabase-backed data layer. Same exported function names/shapes as
// the in-memory one replica-build wrote (src/lib/store.ts, now replaced) —
// screens didn't need to change, only gain `await` at call sites, since the
// fake layer was already async-shaped for exactly this swap.
//
// Every query here is additionally scoped by the RLS policies in
// supabase/migrations/0001_init.sql — passing the wrong id is a 0-row
// result, never another user's data, even if a filter below has a bug.

type Row = Record<string, unknown>;

function mapCustomer(row: Row): Customer {
  return {
    id: row.id as string,
    khataBookId: row.khata_book_id as string,
    name: row.name as string,
    phoneNumber: (row.phone_number as string | null) ?? null,
    whatsappOptOut: Boolean(row.whatsapp_opt_out),
    createdAt: row.created_at as string,
  };
}

function mapTransaction(row: Row): Transaction {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    khataBookId: row.khata_book_id as string,
    type: row.type as Transaction["type"],
    amountCents: row.amount_cents as number,
    paymentMode: (row.payment_mode as Transaction["paymentMode"]) ?? null,
    note: (row.note as string | null) ?? null,
    transactionDate: row.transaction_date as string,
    createdAt: row.created_at as string,
  };
}

function mapBillSend(row: Row): BillSend {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    channel: row.channel as BillSend["channel"],
    status: row.status as BillSend["status"],
    createdAt: row.created_at as string,
  };
}

function mapReminder(row: Row): Reminder {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    scheduledFor: row.scheduled_for as string,
    channel: row.channel as Reminder["channel"],
    status: row.status as Reminder["status"],
    createdAt: row.created_at as string,
  };
}

// Picks the current user's first khata book (the trigger in 0001_init.sql
// creates one, "My Shop", the moment they first sign in). Multiple books
// (S08) aren't built yet — see replica/build-log.md — so every screen that
// needs "the" book uses this one.
export async function getDefaultBook(): Promise<KhataBook> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("khata_books")
    .select("id, business_name, book_type")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No khata book found for user ${user.id}: ${error?.message}`);
  }

  return { id: data.id, businessName: data.business_name, bookType: data.book_type };
}

export async function listCustomers(khataBookId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("khata_book_id", khataBookId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listCustomers: ${error.message}`);
  return (data ?? []).map(mapCustomer);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`getCustomer: ${error.message}`);
  return data ? mapCustomer(data) : undefined;
}

export async function createCustomer(input: {
  khataBookId: string;
  name: string;
  phoneNumber: string | null;
}): Promise<Customer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      khata_book_id: input.khataBookId,
      name: input.name,
      phone_number: input.phoneNumber,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`createCustomer: ${error?.message}`);
  return mapCustomer(data);
}

export async function listTransactions(customerId: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listTransactions: ${error.message}`);
  return (data ?? []).map(mapTransaction);
}

export async function addTransaction(input: {
  customerId: string;
  khataBookId: string;
  type: Transaction["type"];
  amountCents: number;
  paymentMode: Transaction["paymentMode"];
  note: string | null;
  transactionDate: string;
}): Promise<Transaction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customerId,
      khata_book_id: input.khataBookId,
      type: input.type,
      amount_cents: input.amountCents,
      payment_mode: input.paymentMode,
      note: input.note,
      transaction_date: input.transactionDate,
      client_created_at: new Date().toISOString(), // no offline capture yet — see build-log.md
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`addTransaction: ${error?.message}`);
  return mapTransaction(data);
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`getTransaction: ${error.message}`);
  return data ? mapTransaction(data) : undefined;
}

// Positive => customer owes the shop ("you'll get"). Negative => the shop
// owes the customer ("you'll give"). Computed in JS over the (small,
// per-customer) transaction list rather than a SQL aggregate — fine at this
// scale; revisit if a single customer's history grows into the thousands.
export async function getCustomerBalanceCents(customerId: string): Promise<number> {
  const transactions = await listTransactions(customerId);
  return transactions.reduce(
    (balance, t) => balance + (t.type === "you_gave" ? t.amountCents : -t.amountCents),
    0,
  );
}

export async function listReminders(customerId: string): Promise<Reminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listReminders: ${error.message}`);
  return (data ?? []).map(mapReminder);
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reminders").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`getReminder: ${error.message}`);
  return data ? mapReminder(data) : undefined;
}

export async function scheduleReminder(input: {
  customerId: string;
  scheduledFor: string;
  channel: Reminder["channel"];
}): Promise<Reminder> {
  const supabase = await createClient();

  const customer = await getCustomer(input.customerId);
  if (!customer) throw new Error(`scheduleReminder: no such customer ${input.customerId}`);

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      khata_book_id: customer.khataBookId,
      customer_id: input.customerId,
      scheduled_for: input.scheduledFor,
      channel: input.channel,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`scheduleReminder: ${error?.message}`);
  return mapReminder(data);
}

export async function setReminderStatus(
  id: string,
  status: Reminder["status"],
  extra?: { whatsappMessageId?: string; razorpayPaymentLinkId?: string },
): Promise<Reminder | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .update({
      status,
      ...(extra?.whatsappMessageId ? { whatsapp_message_id: extra.whatsappMessageId } : {}),
      ...(extra?.razorpayPaymentLinkId ? { razorpay_payment_link_id: extra.razorpayPaymentLinkId } : {}),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`setReminderStatus: ${error.message}`);
  return data ? mapReminder(data) : undefined;
}

export async function createBillSend(input: {
  khataBookId: string;
  transactionId: string;
  channel: BillSend["channel"];
  status: BillSend["status"];
  error?: string;
  providerMessageId?: string;
}): Promise<BillSend> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bill_sends")
    .insert({
      khata_book_id: input.khataBookId,
      transaction_id: input.transactionId,
      channel: input.channel,
      status: input.status,
      error: input.error ?? null,
      provider_message_id: input.providerMessageId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`createBillSend: ${error?.message}`);
  return mapBillSend(data);
}

// Which of these transaction ids already have at least one successful bill
// send — enough for the UI to show "Sent" vs "Send bill" without a row per
// transaction, since a shopkeeper only cares whether it went out, not the
// full send history.
export async function listSentBillTransactionIds(transactionIds: string[]): Promise<Set<string>> {
  if (transactionIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bill_sends")
    .select("transaction_id")
    .in("transaction_id", transactionIds)
    .eq("status", "sent");

  if (error) throw new Error(`listSentBillTransactionIds: ${error.message}`);
  return new Set((data ?? []).map((r) => r.transaction_id as string));
}
