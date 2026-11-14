import "server-only";

// Parses a spoken transaction ("Ramesh ko paanch sau rupaye diye") into
// structured fields. Uses Claude's tool-use mode to force a fixed JSON
// shape out of free-form Hindi/English/Hinglish speech — regex/keyword
// matching can't handle the amount-in-words + name-in-the-middle word order
// Hindi speech produces ("Ramesh ko 500 rupaye diye" vs "500 rupaye Ramesh
// ko diye" vs "Ramesh se 500 rupaye liye"), so this is the one place in the
// app that calls out to a paid API per entry (see replica/architecture.md).
const MODEL = "claude-haiku-5-5";

export type ParsedVoiceEntry = {
  type: "you_gave" | "you_got";
  amountRupees: number;
  note: string | null;
  spokenCustomerName: string;
  matchedCustomerId: string | null;
  matchedCustomerName: string | null;
};

type ToolInput = {
  spoken_customer_name: string;
  matched_customer_id: string | null;
  type: "you_gave" | "you_got";
  amount_rupees: number;
  note: string | null;
};

export async function parseVoiceTransaction(input: {
  transcript: string;
  customers: { id: string; name: string }[];
}): Promise<ParsedVoiceEntry> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Voice entry needs ANTHROPIC_API_KEY to be set");

  const customerList =
    input.customers.map((c) => `${c.id}: ${c.name}`).join("\n") || "(no customers yet)";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system:
        "You transcribe-to-structure spoken ledger entries from an Indian kirana shopkeeper, " +
        "in Hindi, English, or Hinglish. 'diya'/'de diya'/'gave' means you_gave (the shop gave " +
        "credit, the customer owes more). 'liya'/'mil gaya'/'got'/'paid' means you_got (the " +
        "customer paid, owes less). Match the spoken customer name against the given list by " +
        "sound and meaning, not just spelling (Hindi names are transcribed inconsistently by " +
        "speech-to-text) — set matched_customer_id to its id if you're confident, otherwise " +
        "null. Numbers may be spoken as words (\"paanch sau\" = 500). If no amount is clearly " +
        "stated, still return your best guess but keep it conservative.",
      messages: [
        {
          role: "user",
          content: `Existing customers (id: name):\n${customerList}\n\nSpoken entry: "${input.transcript}"`,
        },
      ],
      tools: [
        {
          name: "record_entry",
          description: "Record the parsed ledger entry",
          input_schema: {
            type: "object",
            properties: {
              spoken_customer_name: { type: "string" },
              matched_customer_id: { type: ["string", "null"] },
              type: { type: "string", enum: ["you_gave", "you_got"] },
              amount_rupees: { type: "number" },
              note: { type: ["string", "null"] },
            },
            required: ["spoken_customer_name", "type", "amount_rupees"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_entry" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice parsing failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const toolUse = (json.content ?? []).find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Couldn't understand that. Try again or enter it manually.");
  }

  const out = toolUse.input as ToolInput;
  if (!Number.isFinite(out.amount_rupees) || out.amount_rupees <= 0) {
    throw new Error("Didn't catch an amount. Try again or enter it manually.");
  }

  const matched = out.matched_customer_id
    ? input.customers.find((c) => c.id === out.matched_customer_id) ?? null
    : null;

  return {
    type: out.type,
    amountRupees: out.amount_rupees,
    note: out.note || null,
    spokenCustomerName: out.spoken_customer_name,
    matchedCustomerId: matched?.id ?? null,
    matchedCustomerName: matched?.name ?? null,
  };
}
