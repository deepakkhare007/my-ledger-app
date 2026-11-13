import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("F04 request payment via UPI", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "seeded-user.json") });

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") throw new Error(`console error: ${msg.text()}`);
    });
  });

  // F04-H1 (a real Razorpay Payment Link gets created) and F04-N1 (a
  // declined payment on Razorpay's own checkout) both need a real
  // Razorpay test-mode account — not automated here, see test-plan.md.

  test("F04-E1 nothing outstanding is rejected before calling Razorpay", async ({ page }) => {
    const name = `Settled Customer ${Date.now()}`;
    await page.goto("/customers/new");
    await page.getByLabel("Customer name").fill(name);
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.getByRole("link", { name: "Remind to pay" }).click();
    await page.getByRole("button", { name: /request via upi/i }).click();
    await expect(page.getByText(/nothing outstanding/i)).toBeVisible();
  });
});
