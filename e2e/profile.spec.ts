/**
 * Profile page tests.
 *
 * Covers:
 *   1. /profile route renders the Profile heading (user display name)
 *   2. Stats grid is visible (Lists Created, Shared Lists, Items Done, Completion Rate)
 *   3. Plan section shows "free" with an Upgrade link for free-plan users
 *   4. Back to lists link navigates to /d
 *   5. User email is shown in profile header
 *
 * All tests use seedAuthSession() + mockConvexWebSocket() (free plan = getUserSubscription: null).
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket } from "./fixtures/convex";

async function gotoProfile(page: import("@playwright/test").Page) {
  await mockConvexWebSocket(page, { existingListCount: 2 });
  await seedAuthSession(page);
  await page.goto("/profile");
  // Wait for the page to finish loading (the loading skeleton disappears and profile renders)
  await expect(page.getByRole("link", { name: /Back to lists/i })).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Profile page", () => {
  test("1. /profile route renders without redirect for authenticated user", async ({ page }) => {
    await gotoProfile(page);
    await expect(page).toHaveURL("/profile");
  });

  test("2. profile header shows user email", async ({ page }) => {
    await gotoProfile(page);
    // seedAuthSession seeds email as "e2e+mission-control@poo.app"
    await expect(page.getByText("e2e+mission-control@poo.app")).toBeVisible();
  });

  test("3. stats grid renders key stat labels", async ({ page }) => {
    await gotoProfile(page);

    await expect(page.getByText("Lists Created")).toBeVisible();
    await expect(page.getByText("Shared Lists")).toBeVisible();
    await expect(page.getByText("Items Done")).toBeVisible();
    await expect(page.getByText("Completion Rate")).toBeVisible();
  });

  test("4. Activity Summary section is visible", async ({ page }) => {
    await gotoProfile(page);

    await expect(
      page.getByRole("heading", { name: "Activity Summary" }),
    ).toBeVisible();
  });

  test("5. Plan section shows Upgrade CTA for free-plan users", async ({ page }) => {
    await gotoProfile(page);

    // Plan section heading (rendered as "💳 Plan" with emoji in a span)
    await expect(page.getByRole("heading", { name: /Plan/i })).toBeVisible();

    // "Upgrade →" link in the Plan section (exact text, distinct from header badge "Upgrade")
    const upgradeLink = page.getByRole("link", { name: "Upgrade →", exact: true });
    await expect(upgradeLink).toBeVisible();
    await expect(upgradeLink).toHaveAttribute("href", "/pricing");
  });

  test("6. Back to lists link navigates to /d", async ({ page }) => {
    await gotoProfile(page);

    await page.getByRole("link", { name: /Back to lists/i }).click();

    await expect(page).toHaveURL("/d", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("7. DID is displayed in profile", async ({ page }) => {
    await gotoProfile(page);

    // DID section has a label "Your DID"
    await expect(page.getByText("Your DID")).toBeVisible();

    // The DID is truncated for long values: "did:webvh:e2...borg-001"
    // Verify the beginning of the DID is visible (first 12 chars = "did:webvh:e2")
    await expect(page.getByText(/did:webvh:e2/)).toBeVisible();
  });
});
