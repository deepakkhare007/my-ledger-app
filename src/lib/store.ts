import "server-only";
import type { Customer, KhataBook, Reminder, Transaction } from "./types";

// In-memory fake data layer for the vertical slice (replica-build step 2).
// Function names and shapes are written to match what replica-architect's
// sync/pull + sync/push routes will return, so swapping this module for a
// real Postgres-backed one later changes no screen code.
//
// Known limitation (see replica/build-log.md): state lives in this module's
// memory, so it resets on a server restart. Fine for a vertical slice, not
// for anything else.

const DEFAULT_BOOK: KhataBook = {
  id: "book-1",
  businessName: "My Shop",
  bookType: "business",
};

let customers: Customer[] = [
  {
    id: "cust-1",
    khataBookId: DEFAULT_BOOK.id,
    name: "Ramesh Kirana Store",
    phoneNumber: "+919876500001",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "cust-2",
    khataBookId: DEFAULT_BOOK.id,
    name: "Suresh Medical",
    phoneNumber: "+919876500002",
    createdAt: "2026-10-03T09:00:00.000Z",
  },
];

let transactions: Transaction[] = [
  {
    id: "txn-1",
    customerId: "cust-1",
    khataBookId: DEFAULT_BOOK.id,
    type: "you_gave",
    amountCents: 24000,
    paymentMode: null,
    note: "2 bags rice",
    transactionDate: "2026-11-05",
    createdAt: "2026-11-05T10:00:00.000Z",
  },
  {
    id: "txn-2",
    customerId: "cust-2",
    khataBookId: DEFAULT_BOOK.id,
    type: "you_gave",
    amountCents: 12000,
    paymentMode: null,
    note: "medicines",
    transactionDate: "2026-11-07",
    createdAt: "2026-11-07T11:00:00.000Z",
  },
  {
    id: "txn-3",
    customerId: "cust-2",
    khataBookId: DEFAULT_BOOK.id,
    type: "you_got",
    amountCents: 3500,
    paymentMode: "cash",
    note: "part payment",
    transactionDate: "2026-11-08",
    createdAt: "2026-11-08T12:00:00.000Z",
  },
];

let reminders: Reminder[] = [];

let nextId = 100;
function freshId(prefix: string) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

export function getDefaultBook(): KhataBook {
  return DEFAULT_BOOK;
}

export function listCustomers(khataBookId: string): Customer[] {
  return customers
    .filter((c) => c.khataBookId === khataBookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCustomer(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function createCustomer(input: {
  khataBookId: string;
  name: string;
  phoneNumber: string | null;
}): Customer {
  const customer: Customer = {
    id: freshId("cust"),
    khataBookId: input.khataBookId,
    name: input.name,
    phoneNumber: input.phoneNumber,
    createdAt: new Date().toISOString(),
  };
  customers = [...customers, customer];
  return customer;
}

export function listTransactions(customerId: string): Transaction[] {
  return transactions
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt));
}

export function addTransaction(input: {
  customerId: string;
  khataBookId: string;
  type: Transaction["type"];
  amountCents: number;
  paymentMode: Transaction["paymentMode"];
  note: string | null;
  transactionDate: string;
}): Transaction {
  const txn: Transaction = {
    id: freshId("txn"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  transactions = [...transactions, txn];
  return txn;
}

// Positive => customer owes the shop ("you'll get"). Negative => the shop
// owes the customer ("you'll give"). See replica/design/components.md.
export function getCustomerBalanceCents(customerId: string): number {
  return listTransactions(customerId).reduce(
    (balance, t) => balance + (t.type === "you_gave" ? t.amountCents : -t.amountCents),
    0,
  );
}

export function listReminders(customerId: string): Reminder[] {
  return reminders
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getReminder(id: string): Reminder | undefined {
  return reminders.find((r) => r.id === id);
}

export function scheduleReminder(input: {
  customerId: string;
  scheduledFor: string;
  channel: Reminder["channel"];
}): Reminder {
  const reminder: Reminder = {
    id: freshId("rem"),
    customerId: input.customerId,
    scheduledFor: input.scheduledFor,
    channel: input.channel,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  reminders = [...reminders, reminder];
  return reminder;
}

export function setReminderStatus(id: string, status: Reminder["status"]): Reminder | undefined {
  let updated: Reminder | undefined;
  reminders = reminders.map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, status };
    return updated;
  });
  return updated;
}
