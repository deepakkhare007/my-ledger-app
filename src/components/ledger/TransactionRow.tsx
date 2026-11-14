import { Badge } from "@/components/ui/Badge";
import { SendBillButton } from "@/components/ledger/SendBillButton";
import { formatDate, formatRupees } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function TransactionRow({
  transaction,
  billSent,
}: {
  transaction: Transaction;
  billSent: boolean;
}) {
  const isGave = transaction.type === "you_gave";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-none">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{transaction.note || "No note"}</p>
        <p className="text-sm text-muted">{formatDate(transaction.transactionDate)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant={isGave ? "outflow" : "inflow"}>
          {isGave ? "you gave" : "you got"} {formatRupees(transaction.amountCents)}
        </Badge>
        <SendBillButton transactionId={transaction.id} alreadySent={billSent} />
      </div>
    </div>
  );
}
