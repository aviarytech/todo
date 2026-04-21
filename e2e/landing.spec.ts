/**
 * Landing page tests.
 *
 * Covers:
 *   - Boop branding (wordmark + hero) renders
 *   - Primary CTAs navigate to /login for unauthenticated users
 *   - "How it works", pricing, and FAQ sections render
 *   - Footer Privacy link navigates to /privacy
 *   - OG image meta tag is set to /og-image.png
 *   - No fabricated user-count stats or "loved by" testimonials
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("1. page loads with boop wordmark in nav and hero", async ({ page }) => {
    await page.goto("/");
    // Wordmark in nav
    await expect(page.getByRole("navigation").getByText("boop").first()).toBeVisible();
    // Hero heading "boop."
    await expect(page.getByRole("heading", { level: 1, name: /boop\./ })).toBeVisible();
    // Hero subtitle (partial match on a distinctive phrase)
    await expect(
      page.getByText(/calm little place for the things you need to do/i),
    ).toBeVisible();
  });

  test("2. primary hero CTA navigates unauthenticated users to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Get boop — free/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("3. nav Sign in link navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("4. how-it-works section lists the three features", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Write it down." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Share, carefully." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boop it." })).toBeVisible();
  });

  test("5. pricing section shows Personal, Shared, and Team plans", async ({ page }) => {
    await page.goto("/");
    // Scroll the pricing section into view to avoid lazy-rendered assertions being flaky
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    const pricing = page.locator("#pricing");
    await expect(pricing.getByText("Personal", { exact: true }).first()).toBeVisible();
    await expect(pricing.getByText("Shared", { exact: true }).first()).toBeVisible();
    await expect(pricing.getByText("Team", { exact: true }).first()).toBeVisible();
  });

  test("6. FAQ section is present", async ({ page }) => {
    await page.goto("/");
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Just the honest questions." })).toBeVisible();
  });

  test("7. footer Privacy link navigates to /privacy", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL("/privacy");
  });

  test("8. footer tagline is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Made carefully, in a quiet room.")).toBeVisible();
  });

  test("9. OG image meta tag points to /og-image.png", async ({ page }) => {
    await page.goto("/");
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /\/og-image\.png/);
    const twitterImage = page.locator('meta[name="twitter:image"]');
    await expect(twitterImage).toHaveAttribute("content", /\/og-image\.png/);
  });

  test("10. no fabricated user-count stats are visible", async ({ page }) => {
    await page.goto("/");
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(
      /\b\d[\d,]+\+?\s*(users|customers|downloads|reviews|ratings)\b/i,
    );
  });

  test("11. no 'loved by' testimonials section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /testimonial/i })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /loved by/i })).not.toBeVisible();
  });
});
