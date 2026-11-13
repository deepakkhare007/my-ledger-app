import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Local-dev-only test phone numbers + fixed OTPs, matching
// supabase/config.toml's [auth.sms.test_otp]. Never valid against a real
// SMS provider or a hosted project.
export const SEEDED_USER = { phone: "+910000000001", otp: "123456" };
export const SECOND_USER = { phone: "+910000000002", otp: "654321" }; // no data of its own — see loginAs usage in rls.spec.ts

export async function loginAs(page: Page, user: { phone: string; otp: string }) {
  await page.goto("/login");
  await page.getByLabel("Phone number").fill(user.phone);
  await page.getByRole("button", { name: /send code/i }).click();
  await page.getByLabel("Enter the code").fill(user.otp);
  await page.getByRole("button", { name: /verify/i }).click();
  await expect(page).toHaveURL(/\/customers$/);
}
