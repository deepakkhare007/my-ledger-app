import Link from "next/link";
import { VoiceEntryFlow } from "@/components/ledger/VoiceEntryFlow";
import { getDefaultBook, listCustomers } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Voice-enabled transaction entry. Speak the whole sale ("Ramesh ko 500
// rupaye diye"); VoiceEntryFlow records it, sends the transcript to
// parseVoiceEntryAction for NLU parsing, then shows an editable confirm
// screen before anything is saved — see src/lib/voice.ts.
export default async function VoiceEntryPage() {
  const user = await requireUser();
  const book = await getDefaultBook();
  const customers = await listCustomers(book.id);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .maybeSingle();
  const language = (profile?.language as "hi" | "en" | undefined) ?? "hi";

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">Voice entry</h1>
        <Link href="/customers" className="text-sm font-medium text-accent">
          Cancel
        </Link>
      </div>

      <VoiceEntryFlow customers={customers.map((c) => ({ id: c.id, name: c.name }))} language={language} />
    </main>
  );
}
