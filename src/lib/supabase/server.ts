import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Request-scoped Supabase client, bound to the signed-in user's session via
// http-only cookies. Every query through this client is subject to the RLS
// policies in supabase/migrations/0001_init.sql — it can never see another
// user's rows, even if application code has a bug.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written — middleware.ts refreshes the session on every
            // request instead, so this is safe to ignore here.
          }
        },
      },
    },
  );
}
