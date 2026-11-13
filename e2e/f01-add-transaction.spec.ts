import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

const AUTH_FILE = path.join(__dirname, ".auth", "seeded-user.json");

async function openFreshCustomer(page: import("@playwright/test").Page, namePrefix: string) {
  const name = `${namePrefix} ${Date.now()}`;
  await page.goto("/customers/new");
  await page.getByLabel("Customer name").fill(name);
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return name;
}

test.describe("F01 log a credit sale", () => {
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") throw new Error(`console error: ${msg.text()}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 500) throw new Error(`${res.status()} on ${res.url()}`);
    });
  });

  test("F01-H1 You Gave increases the balance", async ({ page }) => {
    await openFreshCustomer(page, "H1 Customer");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("500");
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/you'll get ₹500/i)).toBeVisible();
    await expect(page.getByText(/you gave ₹500/i)).toBeVisible();

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
  });

  test("F01-H2 You Got decreases the balance", async ({ page }) => {
    await openFreshCustomer(page, "H2 Customer");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("500");
    await page.getByRole("button", { name: /^save$/i }).click();

    await page.getByRole("link", { name: "You Got" }).click();
    await page.getByLabel("Amount (₹)").fill("200");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/you'll get ₹300/i)).toBeVisible();
    await expect(page.getByText(/you got ₹200/i)).toBeVisible();
  });

  test("F01-E1/N1 empty or non-numeric amount is rejected", async ({ page }) => {
    const name = await openFreshCustomer(page, "Empty Amount");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/greater than zero/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: `Add entry for ${name}` })).toBeVisible();
  });

  test("F01-N1 non-numeric amount is rejected", async ({ page }) => {
    const name = await openFreshCustomer(page, "Non Numeric Amount");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("abc");
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/greater than zero/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: `Add entry for ${name}` })).toBeVisible();
  });

  test("F01-E2 zero amount is rejected", async ({ page }) => {
    await openFreshCustomer(page, "Zero Amount");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("0");
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/greater than zero/i)).toBeVisible();
  });

  test("F01-E3 very long note saves without truncation", async ({ page }) => {
    const name = await openFreshCustomer(page, "Long Note");
    const note = "x".repeat(500);
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("10");
    await page.getByLabel("Note (optional)").fill(note);
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(note)).toBeVisible();
  });

  test("F01-E4 emoji and Devanagari note round-trips", async ({ page }) => {
    const note = "चाय ₹50 ☕️🙏";
    await openFreshCustomer(page, "Emoji Note");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("50");
    await page.getByLabel("Note (optional)").fill(note);
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(note)).toBeVisible();
  });

  test("F01-E5 double-click submit creates exactly one transaction", async ({ page }) => {
    await openFreshCustomer(page, "Double Submit");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("77");
    // A real double-click gesture (not two sequential .click() calls,
    // which Playwright's actionability wait turns into "wait for the
    // button to re-enable" once the first click starts a pending
    // submit — masking the very race this case means to test).
    await page.getByRole("button", { name: /^save$/i }).dblclick();

    await expect(page.getByText(/you'll get ₹77/i)).toBeVisible();
    await expect(page.getByText(/you gave ₹77/i)).toHaveCount(1);
  });

  test("F01-E10 keyboard-only can complete the happy path", async ({ page }) => {
    await openFreshCustomer(page, "Keyboard Only");
    await page.getByRole("link", { name: "You Gave" }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Amount (₹)").fill("30");
    await page.keyboard.press("Tab"); // note
    await page.keyboard.press("Tab"); // date
    await page.keyboard.press("Tab"); // payment mode select
    await page.keyboard.press("Tab"); // save button
    await page.keyboard.press("Enter");
    await expect(page.getByText(/you'll get ₹30/i)).toBeVisible();
  });
});

test.describe("F01 mobile width", () => {
  test.use({ storageState: AUTH_FILE, viewport: { width: 390, height: 844 } });

  test("F01-E9 happy path at 390px", async ({ page }) => {
    await openFreshCustomer(page, "Mobile Width");
    await page.getByRole("link", { name: "You Gave" }).click();
    await page.getByLabel("Amount (₹)").fill("15");
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/you'll get ₹15/i)).toBeVisible();
  });
});
