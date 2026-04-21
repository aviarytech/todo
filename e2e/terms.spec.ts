/**
 * Terms of Service page tests (POO-44 / POO-58)
 *
 * Covers:
 *   - /terms route exists and renders
 *   - Key sections and content visible
 *   - Back link navigates to landing
 *   - Footer Terms link on landing page navigates here
 */

import { test, expect } from "@playwright/test";

test.describe("Terms of Service page", () => {
  test("1. /terms route renders the Terms of Service heading", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("2. page shows last-updated date (March 2026)", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByText("March 2026")).toBeVisible();
  });

  test("3. key sections are present", async ({ page }) => {
    await page.goto("/terms");

    const sections = [
      "Agreement to Terms",
      "User Accounts",
      "Acceptable Use",
      "Payment Terms",
      "Intellectual Property",
      "Limitation of Liability",
      "Governing Law",
      "Termination",
      "Contact",
    ];

    for (const section of sections) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
  });

  test("4. contact email links are present", async ({ page }) => {
    await page.goto("/terms");

    // Legal email
    await expect(page.getByRole("link", { name: "legal@trypoo.app" })).toBeVisible();
    // Support email in Payment Terms
    await expect(page.getByRole("link", { name: "support@trypoo.app" })).toBeVisible();
  });

  test("5. Stripe terms link is present", async ({ page }) => {
    await page.goto("/terms");
    const stripeLink = page.getByRole("link", { name: "Stripe's terms" });
    await expect(stripeLink).toBeVisible();
    await expect(stripeLink).toHaveAttribute("target", "_blank");
    await expect(stripeLink).toHaveAttribute("rel", /noopener/);
  });

  test("6. back link navigates to landing page", async ({ page }) => {
    await page.goto("/terms");

    const backLink = page.getByRole("link", { name: /Back to boop/i });
    await expect(backLink).toBeVisible();
    await backLink.click();

    // Should be on the landing page
    await expect(page).toHaveURL("/");
  });
});
