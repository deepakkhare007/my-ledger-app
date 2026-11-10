import { Stub } from "@/components/Stub";

export default function LoginPage() {
  return (
    <Stub
      screenId="S01"
      title="Onboarding / phone sign-in"
      purpose="Authenticate the shopkeeper by phone number + OTP. Not wired in this build — the vertical slice treats the default khata book as already signed in; real auth is a replica-backend task."
    />
  );
}
