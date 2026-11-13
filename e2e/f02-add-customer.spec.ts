import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

test.describe("F02 add a brand-new customer", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "seeded-user.json") });

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") throw new Error(`console error: ${msg.text()}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 500) throw new Error(`${res.status()} on ${res.url()}`);
    });
    await page.goto("/customers");
  });

  test("F02-H1 happy path: add customer then record opening balance", async ({ page }) => {
    const name = `Test Customer ${Date.now()}`;
    await page.getByRole("link", { name: /add customer/i }).click();
    await page.getByLabel("Customer name").fill(name);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("100");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/you'll get ₹100/i)).toBeVisible();

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
  });

  test("F02-E1 empty name is rejected", async ({ page }) => {
    await page.getByRole("link", { name: /add customer/i }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/customers\/new$/);
  });

  test("F02-E2 very long name is rejected", async ({ page }) => {
    await page.getByRole("link", { name: /add customer/i }).click();
    await page.getByLabel("Customer name").fill("A".repeat(150));
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/120 characters/i)).toBeVisible();
  });

  test("F02-E3 emoji and Devanagari accents round-trip", async ({ page }) => {
    const name = "राम की दुकान 🏪";
    await page.getByRole("link", { name: /add customer/i }).click();
    await page.getByLabel("Customer name").fill(name);
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

  test("F02-E5 double-click submit creates exactly one customer", async ({ page }) => {
    const name = `Double Click ${Date.now()}`;
    await page.getByRole("link", { name: /add customer/i }).click();
    await page.getByLabel("Customer name").fill(name);
    // A real double-click gesture (not two sequential .click() calls,
    // which Playwright's actionability wait turns into "wait for the
    // button to re-enable" once the first click starts a pending
    // submit — masking the very race this case means to test).
    await page.getByRole("button", { name: /^save$/i }).dblclick();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.goto("/customers");
    await page.getByLabel("Search customers").fill(name);
    await expect(page.getByText(name)).toHaveCount(1);
  });

  test("F02-N1 duplicate names are both created (not a uniqueness bug)", async ({ page }) => {
    const name = `Duplicate ${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      await page.goto("/customers/new");
      await page.getByLabel("Customer name").fill(name);
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await page.goto("/customers");
    await page.getByLabel("Search customers").fill(name);
    await expect(page.getByText(name)).toHaveCount(2);
  });
});

test.describe("F02-E6 second user's data must be invisible (RLS)", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "second-user.json") });

  test("a fresh second user sees none of the seeded user's customers", async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") throw new Error(`console error: ${msg.text()}`);
    });
    await page.goto("/customers");
    await expect(page.getByText(/no customers yet/i)).toBeVisible();
    await expect(page.getByText("Ramesh Kirana Store")).toHaveCount(0);
    await expect(page.getByText("Suresh Medical")).toHaveCount(0);
  });
});
