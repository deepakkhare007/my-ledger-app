"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { BalanceBadge } from "@/components/ledger/BalanceBadge";
import { formatDate } from "@/lib/format";

export type CustomerRowData = {
  id: string;
  name: string;
  balanceCents: number;
  lastEntryAt: string | null;
};

export function CustomerList({ customers }: { customers: CustomerRowData[] }) {
  const [query, setQuery] = useState("");

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Search customers"
        placeholder="Search by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          {customers.length === 0
            ? "No customers yet. Add your first customer to start a khata."
            : "No customer matches that search."}
        </p>
      )}

      {filtered.map((customer) => (
        // A single interactive element (the <Link>'s <a>) styled like a
        // card — not an <a><button>> nesting, which PressableCard would give.
        <Link
          key={customer.id}
          href={`/customers/${customer.id}`}
          className="block rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]
            transition hover:bg-border/20 active:bg-border/30
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{customer.name}</p>
              <p className="text-sm text-muted">
                {customer.lastEntryAt
                  ? `Last entry: ${formatDate(customer.lastEntryAt)}`
                  : "No entries yet"}
              </p>
            </div>
            <BalanceBadge balanceCents={customer.balanceCents} />
          </div>
        </Link>
      ))}
    </div>
  );
}
