import { LoginForm } from "@/components/ledger/LoginForm";

// S01 — Onboarding / phone sign-in. Outside the (app) route group
// deliberately: that layout fetches the signed-in user's khata book, which
// doesn't exist yet for someone standing on this page.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-lg font-bold text-ink">Sign in</h1>
        <p className="text-sm text-muted">Enter your phone number to get a one-time code.</p>
      </div>
      <LoginForm />
    </main>
  );
}
