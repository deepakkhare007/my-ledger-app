import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import { loginAs, SEEDED_USER, SECOND_USER } from "./helpers/auth";

// Logs in once per test user and saves the session cookies, so individual
// specs reuse storageState instead of each calling loginAs in beforeEach —
// requestOtpAction rate-limits OTP requests to 5 per phone per 10 minutes
// (src/lib/rate-limit.ts), which a real test suite should respect rather
// than work around by loosening production behavior.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();

  for (const [user, file] of [
    [SEEDED_USER, "seeded-user.json"],
    [SECOND_USER, "second-user.json"],
  ] as const) {
    const page = await browser.newPage({ baseURL });
    await loginAs(page, user);
    await page.context().storageState({ path: path.join(__dirname, ".auth", file) });
    await page.close();
  }

  await browser.close();
}
