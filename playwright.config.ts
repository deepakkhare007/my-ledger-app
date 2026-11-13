import { defineConfig, devices } from "@playwright/test";

// Against the local dev server + local Docker Desktop Supabase stack only —
// per replica-test's own rule, never the original app, and never a hosted
// Supabase project either (the seed data below is local/dev fixture data).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share one seeded Supabase instance; avoid cross-test data races
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
