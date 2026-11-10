import { Badge } from "@/components/ui/Badge";
import { formatDate, formatRupees } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isGave = transaction.type === "you_gave";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-none">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{transaction.note || "No note"}</p>
        <p className="text-sm text-muted">{formatDate(transaction.transactionDate)}</p>
      </div>
      <Badge variant={isGave ? "outflow" : "inflow"}>
        {isGave ? "you gave" : "you got"} {formatRupees(transaction.amountCents)}
      </Badge>
    </div>
  );
}
