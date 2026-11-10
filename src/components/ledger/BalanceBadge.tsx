import { Badge } from "@/components/ui/Badge";
import { formatRupees } from "@/lib/format";

// Positive balanceCents => customer owes the shop ("you'll get", green/inflow).
// Negative => the shop owes the customer ("you'll give", red/outflow).
// Zero => settled (neutral). Colour is never the only signal — the words
// "you'll get"/"you'll give"/"settled" are always in the text too.
export function BalanceBadge({ balanceCents }: { balanceCents: number }) {
  if (balanceCents === 0) {
    return <Badge variant="neutral">settled</Badge>;
  }
  if (balanceCents > 0) {
    return <Badge variant="inflow">you&apos;ll get {formatRupees(balanceCents)}</Badge>;
  }
  return <Badge variant="outflow">you&apos;ll give {formatRupees(balanceCents)}</Badge>;
}
