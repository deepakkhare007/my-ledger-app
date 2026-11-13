import { test, expect } from "@playwright/test";
import path from "node:path";
import { SEEDED_USER } from "./helpers/auth";

test.describe("cross-cutting, unauthenticated", () => {
  test("X-01 unauthenticated request to /customers redirects to /login", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("X-03 wrong OTP shows an error and does not sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Phone number").fill(SEEDED_USER.phone);
    await page.getByRole("button", { name: /send code/i }).click();
    await page.getByLabel("Enter the code").fill("000000");
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page.getByText(/didn't work/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("cross-cutting, authenticated", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "seeded-user.json") });

  test("X-04 a nonexistent customer id shows not-found, not a crash", async ({ page }) => {
    // No console-error guard here: Next's not-found flow correctly returns
    // a 404 for the page's own document load, which the browser logs as a
    // resource-load "error" — expected for this specific negative path,
    // not a real client error. Other specs' beforeEach hooks still guard
    // every happy/edge path that should load cleanly.
    await page.goto("/customers/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });
});
