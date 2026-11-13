// Supabase Edge Function (Deno runtime — separate from the Next.js app, so
// this is a standalone implementation, not a re-import of src/lib/whatsapp.ts
// etc.). Scheduled every 15 minutes via pg_cron, per replica/architecture.md:
//
//   select cron.schedule(
//     'reminder-dispatch', '*/15 * * * *',
//     $$ select net.http_post(
//          url := '<project-url>/functions/v1/reminder-dispatch',
//          headers := jsonb_build_object('Authorization', 'Bearer <anon-or-service-key>')
//        ) $$
//   );
//
// Deploy with: supabase functions deploy reminder-dispatch
// Required secrets (supabase secrets set ...): SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN,
// MSG91_AUTH_KEY, MSG91_TEMPLATE_ID.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: due, error } = await supabase
    .from("reminders")
    .select("*, customers(name, phone_number, whatsapp_opt_out)")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = [];
  for (const reminder of due ?? []) {
    const customer = reminder.customers;
    const phone: string | null = customer?.phone_number ?? null;

    if (!phone) {
      await supabase.from("reminders").update({ status: "failed" }).eq("id", reminder.id);
      results.push({ id: reminder.id, status: "failed", reason: "no phone number" });
      continue;
    }

    const preferWhatsApp = reminder.channel === "whatsapp" && !customer?.whatsapp_opt_out;
    let sent = false;
    let messageId: string | undefined;

    if (preferWhatsApp) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("WHATSAPP_ACCESS_TOKEN")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone.replace("+", ""),
              type: "template",
              template: {
                name: "payment_reminder",
                language: { code: "en" },
                components: [
                  {
                    type: "body",
                    parameters: [{ type: "text", text: customer?.name ?? "customer" }],
                  },
                ],
              },
            }),
          },
        );
        if (res.ok) {
          const json = await res.json();
          messageId = json.messages?.[0]?.id;
          sent = true;
        }
      } catch {
        // falls through to SMS
      }
    }

    if (!sent) {
      try {
        const res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            authkey: Deno.env.get("MSG91_AUTH_KEY")!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: Deno.env.get("MSG91_TEMPLATE_ID"),
            recipients: [{ mobiles: phone.replace("+", ""), customer_name: customer?.name ?? "" }],
          }),
        });
        sent = res.ok;
      } catch {
        sent = false;
      }
    }

    await supabase
      .from("reminders")
      .update({
        status: sent ? "sent" : "failed",
        ...(messageId ? { whatsapp_message_id: messageId } : {}),
      })
      .eq("id", reminder.id);

    results.push({ id: reminder.id, status: sent ? "sent" : "failed" });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
