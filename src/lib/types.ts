// Mirrors replica/schema.sql. Money is integer cents; dates are ISO strings
// everywhere here since this layer is in-memory for the vertical slice —
// replica-backend swaps this for real Postgres rows with the same shapes.

export type KhataBook = {
  id: string;
  businessName: string;
  bookType: "business" | "personal";
};

export type Customer = {
  id: string;
  khataBookId: string;
  name: string;
  phoneNumber: string | null;
  createdAt: string;
};

export type TransactionType = "you_gave" | "you_got";
export type PaymentMode = "cash" | "upi" | "bank" | "other";

export type Transaction = {
  id: string;
  customerId: string;
  khataBookId: string;
  type: TransactionType;
  amountCents: number;
  paymentMode: PaymentMode | null;
  note: string | null;
  transactionDate: string; // YYYY-MM-DD
  createdAt: string;
};

export type ReminderChannel = "whatsapp" | "sms" | "upi_link";
export type ReminderStatus = "pending" | "sent" | "failed" | "paid";

export type Reminder = {
  id: string;
  customerId: string;
  scheduledFor: string; // ISO datetime
  channel: ReminderChannel;
  status: ReminderStatus;
  createdAt: string;
};
