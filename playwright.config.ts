import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_E2E_MOCK_ORIGINALS: "true",
      // Stub Stripe price IDs so the Upgrade buttons are not disabled during tests.
      VITE_STRIPE_PRO_MONTHLY_PRICE_ID: "price_e2e_pro_monthly",
      VITE_STRIPE_PRO_YEARLY_PRICE_ID: "price_e2e_pro_yearly",
      VITE_STRIPE_TEAM_PRICE_ID: "price_e2e_team",
    },
  },
});
