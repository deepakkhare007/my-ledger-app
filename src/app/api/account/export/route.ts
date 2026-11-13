import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// "Your data is yours" (replica/fixes.md's #6 fix-plan item, answering
// Khatabook's reviewed complaint about paywalled export) — kept free, and
// deliberately NOT gated behind any plan. Uses the normal per-request
// Supabase client, not the admin one: RLS is what guarantees this only ever
// returns the caller's own rows, even if a query below has a bug.
export async function GET() {
  const user = await requireUser();
  const supabase = await createClient();

  const [books, customers, transactions, reminders, inventoryItems] = await Promise.all([
    supabase.from("khata_books").select("*").eq("owner_id", user.id),
    supabase.from("customers").select("*, khata_books!inner(owner_id)").eq("khata_books.owner_id", user.id),
    supabase
      .from("transactions")
      .select("*, khata_books!inner(owner_id)")
      .eq("khata_books.owner_id", user.id),
    supabase.from("reminders").select("*, khata_books!inner(owner_id)").eq("khata_books.owner_id", user.id),
    supabase
      .from("inventory_items")
      .select("*, khata_books!inner(owner_id)")
      .eq("khata_books.owner_id", user.id),
  ]);

  const strip = (rows: Record<string, unknown>[] | null) =>
    (rows ?? []).map((row) => {
      const { khata_books, ...rest } = row;
      void khata_books;
      return rest;
    });

  const exportPayload = {
    exported_at: new Date().toISOString(),
    khata_books: books.data ?? [],
    customers: strip(customers.data),
    transactions: strip(transactions.data),
    reminders: strip(reminders.data),
    inventory_items: strip(inventoryItems.data),
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-ledger-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
