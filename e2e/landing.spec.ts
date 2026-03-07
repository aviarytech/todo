/**
 * Landing page tests (POO-26 / POO-50)
 *
 * Covers:
 *   - Branding and tagline render correctly
 *   - No fake stats / fabricated user counts visible
 *   - OG image meta tag set to /og-image.png (POO-50)
 *   - Footer links all present and navigable
 *   - Nav Pricing link works
 *   - Waitlist email form present
 *   - No fake testimonials
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("1. page loads with Poo App branding and tagline", async ({ page }) => {
    await page.goto("/");
    // Brand name visible
    await expect(page.getByText("Poo App").first()).toBeVisible();
    // Hero tagline
    await expect(page.getByRole("heading", { name: /Organize your life/i })).toBeVisible();
    await expect(page.getByText(/while you Poop/i).first()).toBeVisible();
  });

  test("2. nav Pricing link is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Pricing" })).toBeVisible();
  });

  test("3. nav Pricing link navigates to /pricing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL("/pricing");
  });

  test("4. Sign In button navigates to /login for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("5. Get Started Free CTA navigates to /login for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get Started Free" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("6. OG image meta tag points to /og-image.png (POO-50)", async ({ page }) => {
    await page.goto("/");
    // og:image must be set
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /\/og-image\.png/);
    // twitter:image also set
    const twitterImage = page.locator('meta[name="twitter:image"]');
    await expect(twitterImage).toHaveAttribute("content", /\/og-image\.png/);
  });

  test("7. no fabricated user count stats visible", async ({ page }) => {
    await page.goto("/");
    // The landing page MUST NOT show fake user counts like "10,000 users" or "4.9 stars"
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/\b\d[\d,]+\+?\s*(users|customers|downloads|reviews|ratings)\b/i);
  });

  test("8. no testimonials section", async ({ page }) => {
    await page.goto("/");
    // Testimonials would be a recognizable heading or attribution pattern
    await expect(page.getByRole("heading", { name: /testimonial/i })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /what.*say/i })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /loved by/i })).not.toBeVisible();
  });

  test("9. footer links are all present", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(footer.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
  });

  test("10. footer Privacy link navigates to /privacy", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL("/privacy");
  });

  test("11. features section is present with key feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Real-Time Sync" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team Collaboration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Offline First" })).toBeVisible();
  });

  test("12. waitlist section shows email form for iOS app", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("iOS app launching soon")).toBeVisible();
    await expect(page.getByPlaceholder("your@email.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Join the waitlist" })).toBeVisible();
  });

  test("13. pricing summary section shows Free, Pro, Team plans", async ({ page }) => {
    await page.goto("/");
    // Pricing summary is inline on the landing page
    await expect(page.getByText("5 lists").first()).toBeVisible();
    await expect(page.getByText("Unlimited lists").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /See full pricing details/i })).toBeVisible();
  });

  test("14. social proof strip shows accurate feature claims (no fake numbers)", async ({ page }) => {
    await page.goto("/");
    // These are factual capability claims, not user stats — scoped to the social proof strip
    await expect(page.getByText("Free forever plan").first()).toBeVisible();
    await expect(page.getByText("No credit card required").first()).toBeVisible();
    await expect(page.getByText("Works offline").first()).toBeVisible();
  });
});
