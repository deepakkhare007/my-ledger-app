import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Every Server Component/action that needs the signed-in user calls this
// instead of re-checking auth ad hoc. middleware.ts already redirects
// unauthenticated requests to /login, so reaching here with no user is
// unexpected (a direct fetch to a Server Action, a race during sign-out) —
// redirecting again is the safe fallback either way.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}
